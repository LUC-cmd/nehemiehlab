package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.SecureFileStorage;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.ModuleCoursService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sessions")
@PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
public class SessionController {

    @Autowired
    private SessionCoursRepository sessionCoursRepository;

    @Autowired
    private EvaluationSessionRepository evaluationSessionRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private ModuleCoursService moduleCoursService;

    @GetMapping
    public ResponseEntity<?> getSessions(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<SessionCours> sessions;

        if (user.getRole() == Role.FORMATEUR) {
            sessions = sessionCoursRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId());
        } else if (user.getRole() == Role.COORDINATEUR || user.getRole() == Role.RESPONSABLE_CLUSTER) {
            List<Long> centreIds = centreAccessService.accessibleCentreIds(user);
            sessions = sessionCoursRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(s -> s.getCentre() != null && centreIds.contains(s.getCentre().getId()))
                    .toList();
        } else {
            sessions = sessionCoursRepository.findAllByOrderByCreatedAtDesc();
        }

        for (SessionCours session : sessions) {
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(session.getId());
            session.setNbTotalEleves((long) evals.size());
            session.setNbPresents(evals.stream().filter(EvaluationSession::isPresent).count());
        }

        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSessionById(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        if (!canAccessSession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Accès non autorisé à cette session."));
        }

        List<EvaluationSession> evaluations = evaluationSessionRepository.findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(id);
        Map<String, Object> response = new HashMap<>();
        response.put("session", session);
        response.put("evaluations", evaluations);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> createSession(@RequestBody SessionCours request, Authentication auth) {
        User user = (User) auth.getPrincipal();
        if (request.getCentre() == null || request.getCentre().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Centre obligatoire."));
        }
        Centre centre = centreRepository.findById(request.getCentre().getId()).orElse(null);
        if (centre == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
        }
        if (user.getRole() == Role.FORMATEUR
                && (centre.getFormateurs() == null
                || centre.getFormateurs().stream().noneMatch(f -> f.getId().equals(user.getId())))) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'êtes pas formateur de ce centre."));
        }

        if (request.getTitre() == null || request.getTitre().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le titre de la séance est obligatoire."));
        }

        Long moduleCoursId = request.getModuleCoursId();
        String moduleLabel;
        if (moduleCoursId != null) {
            ModuleCours catalogModule = moduleCoursService.requireActive(moduleCoursId);
            moduleLabel = catalogModule.getTitre();
        } else if (request.getModuleFait() != null && !request.getModuleFait().isBlank()) {
            if (user.getRole() == Role.FORMATEUR) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Sélectionnez un module dans le catalogue défini par le Directeur."));
            }
            moduleLabel = InputSanitizer.clean(request.getModuleFait());
            moduleCoursId = null;
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Veuillez sélectionner le module enseigné."));
        }

        SessionCours session = SessionCours.builder()
                .titre(InputSanitizer.clean(request.getTitre()))
                .dureePrevueMinutes(request.getDureePrevueMinutes())
                .heureDebut(request.getHeureDebut() != null ? request.getHeureDebut() : LocalDateTime.now())
                .statut("EN_COURS")
                .centre(centre)
                .formateur(user)
                .latitudeDebut(request.getLatitudeDebut())
                .longitudeDebut(request.getLongitudeDebut())
                .precisionDebutMetres(request.getPrecisionDebutMetres())
                .moduleFait(moduleLabel)
                .moduleCoursId(moduleCoursId)
                .etatEquipements(InputSanitizer.cleanNullable(request.getEtatEquipements()))
                .defisSession(InputSanitizer.cleanNullable(request.getDefisSession()))
                .build();

        sessionCoursRepository.save(session);

        List<Eleve> eleves = eleveRepository.findByCentreIdOrderByNomAscPrenomAsc(session.getCentre().getId());
        for (Eleve e : eleves) {
            String projetNom = (e.getProjet() != null && e.getProjet().getNom() != null)
                    ? e.getProjet().getNom() : null;
            EvaluationSession eval = EvaluationSession.builder()
                    .sessionCours(session)
                    .eleve(e)
                    .present(false)
                    .note(null)
                    .commentaire(null)
                    .projetTravaille(projetNom)
                    .build();
            evaluationSessionRepository.save(eval);
        }

        return ResponseEntity.ok(session);
    }

    @PutMapping("/{id}/cloturer")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> cloturerSession(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth
    ) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        if ("EN_COURS".equals(session.getStatut())) {
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(id);
            for (EvaluationSession eval : evals) {
                if (eval.isPresent() && eval.getNote() == null) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "message",
                            "Chaque enfant présent doit avoir une note de participation (/10) avant la clôture."
                    ));
                }
            }
            LocalDateTime fin = parseDateTime(body != null ? body.get("heureFin") : null);
            if (fin == null) fin = LocalDateTime.now();
            if (session.getHeureDebut() != null && fin.isBefore(session.getHeureDebut())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "L'heure de fin doit être postérieure à l'heure de début."
                ));
            }
            session.setHeureFin(fin);
            session.setStatut("CLOTUREE");
            long dureeSeance = Math.max(0, Duration.between(session.getHeureDebut(), fin).toMinutes());
            session.setDureeReelleMinutes(dureeSeance);
            sessionCoursRepository.save(session);

            // Cumul heures formateur (début → fin de séance)
            if (session.getFormateur() != null) {
                User formateur = userRepository.findById(session.getFormateur().getId()).orElse(null);
                if (formateur != null) {
                    double heures = dureeSeance / 60.0;
                    double current = formateur.getTotalHeuresSeances() != null ? formateur.getTotalHeuresSeances() : 0.0;
                    formateur.setTotalHeuresSeances(Math.round((current + heures) * 100.0) / 100.0);
                    userRepository.save(formateur);
                }
            }

            // Cumul heures enfants (arrivée → fin ; gère les retards)
            for (EvaluationSession eval : evals) {
                if (!eval.isPresent()) {
                    eval.setHeureDepart(null);
                    eval.setDureeMinutes(0L);
                    eval.setDureeSecondes(0L);
                    evaluationSessionRepository.save(eval);
                    continue;
                }
                LocalDateTime arrivee = eval.getHeureArrivee() != null
                        ? eval.getHeureArrivee()
                        : session.getHeureDebut();
                if (arrivee.isBefore(session.getHeureDebut())) {
                    arrivee = session.getHeureDebut();
                }
                if (arrivee.isAfter(fin)) {
                    arrivee = fin;
                }
                long secondes = Math.max(0, Duration.between(arrivee, fin).getSeconds());
                long minutes = secondes / 60;
                eval.setHeureArrivee(arrivee);
                eval.setHeureDepart(fin);
                eval.setDureeMinutes(minutes);
                eval.setDureeSecondes(secondes);
                evaluationSessionRepository.save(eval);

                if (eval.getEleve() != null && minutes > 0) {
                    Eleve eleve = eleveRepository.findById(eval.getEleve().getId()).orElse(null);
                    if (eleve != null) {
                        double current = eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0.0;
                        eleve.setTotalHeures(Math.round((current + (minutes / 60.0)) * 100.0) / 100.0);
                        eleveRepository.save(eleve);
                    }
                }
            }
        }
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{id}/localisation/debut")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> setLocalisationDebut(
            @PathVariable Long id, @RequestBody LocationRequest request, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        if (!"EN_COURS".equals(session.getStatut())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Session non active."));
        }
        session.setLatitudeDebut(request.getLatitude());
        session.setLongitudeDebut(request.getLongitude());
        session.setPrecisionDebutMetres(request.getPrecisionMetres());
        sessionCoursRepository.save(session);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{id}/localisation/fin")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> setLocalisationFin(
            @PathVariable Long id, @RequestBody LocationRequest request, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        session.setLatitudeFin(request.getLatitude());
        session.setLongitudeFin(request.getLongitude());
        session.setPrecisionFinMetres(request.getPrecisionMetres());
        sessionCoursRepository.save(session);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{id}/rapport")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> uploadRapport(
            @PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        try {
            String fileUrl = secureFileStorage.store(file, "rapports", "document", 15L * 1024 * 1024, "rapport-" + id);
            session.setRapportUrl(fileUrl);
            sessionCoursRepository.save(session);
            return ResponseEntity.ok(session);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du fichier"));
        }
    }

    @PostMapping("/{id}/evaluations/{evalId}/projet-fichier")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> uploadProjetFichier(
            @PathVariable Long id,
            @PathVariable Long evalId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        EvaluationSession eval = evaluationSessionRepository.findById(evalId).orElse(null);
        if (eval == null || eval.getSessionCours() == null || !eval.getSessionCours().getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }
        if (!eval.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "L'enfant doit être marqué présent avant d'ajouter un fichier de projet."));
        }
        try {
            String url = secureFileStorage.store(
                    file, "evaluations-projets", "media", 25L * 1024 * 1024, "projet-eval-" + evalId);
            eval.setProjetFichierUrl(url);
            eval.setProjetFichierNom(file.getOriginalFilename());
            evaluationSessionRepository.save(eval);
            return ResponseEntity.ok(eval);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du fichier"));
        }
    }

    @DeleteMapping("/{id}/evaluations/{evalId}/projet-fichier")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> deleteProjetFichier(
            @PathVariable Long id, @PathVariable Long evalId, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        EvaluationSession eval = evaluationSessionRepository.findById(evalId).orElse(null);
        if (eval == null || eval.getSessionCours() == null || !eval.getSessionCours().getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }
        eval.setProjetFichierUrl(null);
        eval.setProjetFichierNom(null);
        evaluationSessionRepository.save(eval);
        return ResponseEntity.ok(eval);
    }

    @PutMapping("/{id}/evaluations")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> updateEvaluations(
            @PathVariable Long id, @RequestBody List<EvaluationRequest> requests, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        if ("CLOTUREE".equals(session.getStatut())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Session déjà clôturée."));
        }

        for (EvaluationRequest req : requests) {
            EvaluationSession eval = evaluationSessionRepository.findById(req.getId()).orElse(null);
            if (eval != null && eval.getSessionCours() != null && eval.getSessionCours().getId().equals(id)) {
                boolean wasPresent = eval.isPresent();
                boolean nowPresent = req.isPresent();
                eval.setPresent(nowPresent);

                if (!nowPresent) {
                    eval.setNote(null);
                    eval.setHeureArrivee(null);
                    eval.setHeureDepart(null);
                    eval.setDureeMinutes(null);
                    eval.setDureeSecondes(null);
                    eval.setProjetFinal(false);
                    eval.setProjetProbleme(null);
                    eval.setProjetSolution(null);
                } else {
                    // Passage OFF → ON : enregistre l'arrivée (retard possible)
                    if (!wasPresent || eval.getHeureArrivee() == null) {
                        LocalDateTime arrivee = LocalDateTime.now();
                        if (session.getHeureDebut() != null && arrivee.isBefore(session.getHeureDebut())) {
                            arrivee = session.getHeureDebut();
                        }
                        eval.setHeureArrivee(arrivee);
                    }
                    if (req.getNote() != null) {
                        double n = req.getNote();
                        if (n > 10) n = n / 2.0;
                        if (n < 0) n = 0;
                        if (n > 10) n = 10;
                        eval.setNote(n);
                    } else {
                        eval.setNote(null);
                    }
                }
                eval.setCommentaire(InputSanitizer.cleanNullable(req.getCommentaire()));
                eval.setProjetTravaille(InputSanitizer.cleanNullable(req.getProjetTravaille()));

                boolean markFinal = nowPresent && req.isProjetFinal();
                eval.setProjetFinal(markFinal);
                if (markFinal) {
                    eval.setProjetProbleme(InputSanitizer.cleanNullable(req.getProjetProbleme()));
                    eval.setProjetSolution(InputSanitizer.cleanNullable(req.getProjetSolution()));
                    clearOtherFinalProjects(eval.getEleve().getId(), eval.getId());
                    syncFinalProjectToEleve(eval);
                } else {
                    eval.setProjetProbleme(null);
                    eval.setProjetSolution(null);
                }

                evaluationSessionRepository.save(eval);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Évaluations mises à jour."));
    }

    @PutMapping("/{id}/contexte")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> updateContexteSession(
            @PathVariable Long id, @RequestBody SessionContextRequest request, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        if ("CLOTUREE".equals(session.getStatut())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Session déjà clôturée."));
        }
        if (request.getModuleCoursId() != null) {
            ModuleCours catalogModule = moduleCoursService.requireActive(request.getModuleCoursId());
            session.setModuleCoursId(catalogModule.getId());
            session.setModuleFait(catalogModule.getTitre());
        } else if (request.getModuleFait() != null) {
            if (user.getRole() == Role.FORMATEUR) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Sélectionnez un module dans le catalogue défini par le Directeur."));
            }
            session.setModuleFait(InputSanitizer.cleanNullable(request.getModuleFait()));
        }
        session.setEtatEquipements(InputSanitizer.cleanNullable(request.getEtatEquipements()));
        session.setDefisSession(InputSanitizer.cleanNullable(request.getDefisSession()));
        sessionCoursRepository.save(session);
        return ResponseEntity.ok(session);
    }

    @PutMapping("/{id}/horaires")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> updateHoraires(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }

        if (body.containsKey("heureDebut")) {
            LocalDateTime debut = parseDateTime(body.get("heureDebut"));
            if (debut == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Heure de début invalide."));
            }
            session.setHeureDebut(debut);
        }
        if (body.containsKey("heureFin")) {
            LocalDateTime fin = parseDateTime(body.get("heureFin"));
            if (fin == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Heure de fin invalide."));
            }
            session.setHeureFin(fin);
        }
        if (session.getHeureDebut() != null && session.getHeureFin() != null
                && session.getHeureFin().isBefore(session.getHeureDebut())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "L'heure de fin doit être postérieure à l'heure de début."
            ));
        }
        if (session.getHeureDebut() != null && session.getHeureFin() != null) {
            long minutes = Math.max(0, Duration.between(session.getHeureDebut(), session.getHeureFin()).toMinutes());
            session.setDureeReelleMinutes(minutes);
        }
        sessionCoursRepository.save(session);
        return ResponseEntity.ok(session);
    }

    private static LocalDateTime parseDateTime(Object raw) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isBlank()) return null;
        try {
            if (s.endsWith("Z") || s.contains("+")) {
                return LocalDateTime.ofInstant(Instant.parse(s), ZoneId.systemDefault());
            }
            return LocalDateTime.parse(s.length() > 19 ? s.substring(0, 19) : s);
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean canAccessSession(User user, SessionCours session) {
        if (user.getRole() == Role.DIRECTEUR) return true;
        if (user.getRole() == Role.FORMATEUR) {
            return session.getFormateur() != null && session.getFormateur().getId().equals(user.getId());
        }
        if (user.getRole() == Role.COORDINATEUR || user.getRole() == Role.RESPONSABLE_CLUSTER) {
            return session.getCentre() != null
                    && centreAccessService.canAccessCentre(user, session.getCentre().getId());
        }
        return false;
    }

    private boolean canModifySession(User user, SessionCours session) {
        if (user.getRole() == Role.DIRECTEUR) return false;
        return user.getRole() == Role.FORMATEUR
                && session.getFormateur() != null
                && session.getFormateur().getId().equals(user.getId());
    }

    private void clearOtherFinalProjects(Long eleveId, Long currentEvalId) {
        if (eleveId == null) return;
        for (EvaluationSession other : evaluationSessionRepository.findByEleveId(eleveId)) {
            if (!other.getId().equals(currentEvalId) && other.isProjetFinal()) {
                other.setProjetFinal(false);
                evaluationSessionRepository.save(other);
            }
        }
    }

    private void syncFinalProjectToEleve(EvaluationSession eval) {
        if (eval.getEleve() == null) return;
        Eleve eleve = eleveRepository.findById(eval.getEleve().getId()).orElse(null);
        if (eleve == null) return;

        Projet projet = eleve.getProjet();
        if (projet == null) {
            projet = new Projet();
        }
        if (eval.getProjetTravaille() != null && !eval.getProjetTravaille().isBlank()) {
            projet.setNom(eval.getProjetTravaille());
        }
        projet.setProbleme(eval.getProjetProbleme());
        projet.setSolution(eval.getProjetSolution());
        if (projet.getEvolution() == null) {
            projet.setEvolution(100);
        }
        eleve.setProjet(projet);
        eleveRepository.save(eleve);
    }

    @Data
    public static class EvaluationRequest {
        private Long id;
        private boolean present;
        private Double note;
        private String commentaire;
        private String projetTravaille;
        private boolean projetFinal;
        private String projetProbleme;
        private String projetSolution;
    }

    @Data
    public static class LocationRequest {
        private Double latitude;
        private Double longitude;
        private Double precisionMetres;
    }

    @Data
    public static class SessionContextRequest {
        private Long moduleCoursId;
        private String moduleFait;
        private String etatEquipements;
        private String defisSession;
    }
}
