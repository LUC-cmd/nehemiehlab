package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.SecureFileStorage;
import com.nehemiahlab.platform.service.CentreAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Duration;
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
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(session.getId());
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

        List<EvaluationSession> evaluations = evaluationSessionRepository.findBySessionCoursId(id);
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
        if (request.getModuleFait() == null || request.getModuleFait().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le module fait est obligatoire."));
        }

        SessionCours session = SessionCours.builder()
                .titre(InputSanitizer.clean(request.getTitre()))
                .dureePrevueMinutes(request.getDureePrevueMinutes())
                .heureDebut(LocalDateTime.now())
                .statut("EN_COURS")
                .centre(centre)
                .formateur(user)
                .latitudeDebut(request.getLatitudeDebut())
                .longitudeDebut(request.getLongitudeDebut())
                .precisionDebutMetres(request.getPrecisionDebutMetres())
                .moduleFait(InputSanitizer.clean(request.getModuleFait()))
                .etatEquipements(InputSanitizer.cleanNullable(request.getEtatEquipements()))
                .defisSession(InputSanitizer.cleanNullable(request.getDefisSession()))
                .build();

        sessionCoursRepository.save(session);

        List<Eleve> eleves = eleveRepository.findByCentreId(session.getCentre().getId());
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
    public ResponseEntity<?> cloturerSession(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        SessionCours session = sessionCoursRepository.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (!canModifySession(user, session)) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        if ("EN_COURS".equals(session.getStatut())) {
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(id);
            for (EvaluationSession eval : evals) {
                if (eval.isPresent() && eval.getNote() == null) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "message",
                            "Chaque enfant présent doit avoir une note de participation (/10) avant la clôture."
                    ));
                }
            }
            LocalDateTime fin = LocalDateTime.now();
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
                long minutes = Math.max(0, Duration.between(arrivee, fin).toMinutes());
                eval.setHeureArrivee(arrivee);
                eval.setHeureDepart(fin);
                eval.setDureeMinutes(minutes);
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
        if (request.getModuleFait() != null) {
            session.setModuleFait(InputSanitizer.cleanNullable(request.getModuleFait()));
        }
        session.setEtatEquipements(InputSanitizer.cleanNullable(request.getEtatEquipements()));
        session.setDefisSession(InputSanitizer.cleanNullable(request.getDefisSession()));
        sessionCoursRepository.save(session);
        return ResponseEntity.ok(session);
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
        if (user.getRole() == Role.DIRECTEUR) return true;
        return user.getRole() == Role.FORMATEUR
                && session.getFormateur() != null
                && session.getFormateur().getId().equals(user.getId());
    }

    @Data
    public static class EvaluationRequest {
        private Long id;
        private boolean present;
        private Double note;
        private String commentaire;
        private String projetTravaille;
    }

    @Data
    public static class LocationRequest {
        private Double latitude;
        private Double longitude;
        private Double precisionMetres;
    }

    @Data
    public static class SessionContextRequest {
        private String moduleFait;
        private String etatEquipements;
        private String defisSession;
    }
}
