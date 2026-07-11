package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.MatriculeService;
import com.nehemiahlab.platform.service.ParentActivationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/eleves")
public class EleveController {

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private PresenceRepository presenceRepository;

    @Autowired
    private CommentaireRepository commentaireRepository;

    @Autowired
    private SignalementRepository signalementRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EvaluationSessionRepository evaluationSessionRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private ParentActivationService parentActivationService;

    @GetMapping("/centre/{centreId}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<Eleve>> getByCentre(@PathVariable Long centreId, Authentication auth) {
        centreAccessService.requireCentreAccess((User) auth.getPrincipal(), centreId);
        List<Eleve> eleves = eleveRepository.findByCentreId(centreId);
        for (Eleve e : eleves) {
            calculateAndSetPerformance(e);
        }
        return ResponseEntity.ok(eleves);
    }

    private void calculateAndSetPerformance(Eleve e) {
        List<EvaluationSession> evals = evaluationSessionRepository.findByEleveId(e.getId());
        double total = 0;
        int count = 0;
        for (EvaluationSession eval : evals) {
            if (eval.getNote() != null) {
                total += eval.getNote();
                count++;
            }
        }
        if (count > 0) {
            // Notes historiques pouvaient être /20 — normaliser en /10 pour l'affichage
            double avg = total / count;
            if (avg > 10) avg = avg / 2.0;
            e.setPerformanceMoyenne(Math.round(avg * 10.0) / 10.0);
        } else {
            e.setPerformanceMoyenne(null);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'PARENT')")
    public ResponseEntity<Eleve> getById(@PathVariable Long id, Authentication auth) {
        centreAccessService.requireEleveAccess((User) auth.getPrincipal(), id);
        return eleveRepository.findById(id).map(e -> {
            calculateAndSetPerformance(e);
            return ResponseEntity.ok(e);
        }).orElse(ResponseEntity.notFound().build());
    }

    @Autowired
    private MatriculeService matriculeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User creator = (User) auth.getPrincipal();
        Long centreId = Long.valueOf(body.get("centreId").toString());
        centreAccessService.requireCentreAccess(creator, centreId);
        Optional<Centre> centreOpt = centreRepository.findById(centreId);

        if (centreOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Centre non trouvé."));
        }

        Centre centre = centreOpt.get();
        User formateur = null;
        if (creator.getRole() == Role.FORMATEUR) {
            formateur = creator;
        } else if (centre.getFormateurs() != null && !centre.getFormateurs().isEmpty()) {
            formateur = centre.getFormateurs().iterator().next();
        }

        String matricule = matriculeService.generateUniqueMatricule();

        Eleve eleve = Eleve.builder()
                .nom(com.nehemiahlab.platform.security.InputSanitizer.clean(body.get("nom").toString()))
                .prenom(com.nehemiahlab.platform.security.InputSanitizer.clean(body.get("prenom").toString()))
                .matricule(matricule)
                .age(Integer.valueOf(body.get("age").toString()))
                .sexe(body.get("sexe").toString())
                .classe(body.get("classe").toString())
                .centre(centre)
                .formateur(formateur)
                .dateDebutFormation(LocalDate.parse(body.get("dateDebutFormation").toString()))
                .build();

        Eleve saved = eleveRepository.save(eleve);
        calculateAndSetPerformance(saved);

        return ResponseEntity.ok(Map.of(
                "eleve", saved,
                "matricule", saved.getMatricule(),
                "message", "Élève inscrit. Générez séparément un code d'activation parent à usage unique."
        ));
    }

    @PostMapping("/{id}/parent-activation-code")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> issueParentActivationCode(@PathVariable Long id, Authentication auth) {
        Eleve eleve = eleveRepository.findById(id).orElse(null);
        if (eleve == null) return ResponseEntity.notFound().build();
        centreAccessService.requireEleveAccess((User) auth.getPrincipal(), id);
        ParentActivationService.IssuedCode issued = parentActivationService.issue(id);
        return ResponseEntity.ok(Map.of(
                "codeActivation", issued.code(),
                "expireLe", issued.expiresAt(),
                "message", "Code créé. Remettez-le au parent par un canal hors ligne sécurisé; il ne sera plus affiché."
        ));
    }

    @PutMapping("/{id}/projet")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> updateProjet(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();

        Eleve eleve = eleveOpt.get();
        centreAccessService.requireEleveModification((User) auth.getPrincipal(), eleve);
        Projet projet = eleve.getProjet();

        if (projet == null) {
            projet = new Projet();
        }

        projet.setNom(body.get("nom") != null ? body.get("nom").toString() : projet.getNom());
        if (body.get("description") != null) {
            projet.setDescription(body.get("description").toString());
        }
        if (body.get("evolution") != null) {
            projet.setEvolution(Integer.valueOf(body.get("evolution").toString()));
        }
        if (body.containsKey("causeNonAvancement")) {
            Object v = body.get("causeNonAvancement");
            projet.setCauseNonAvancement(v == null ? null : v.toString());
        }
        if (body.containsKey("justificationPedagogique")) {
            Object v = body.get("justificationPedagogique");
            projet.setJustificationPedagogique(v == null ? null : v.toString());
        }
        if (body.containsKey("pointsForts")) {
            Object v = body.get("pointsForts");
            projet.setPointsForts(v == null ? null : v.toString());
        }
        if (body.containsKey("recommandations")) {
            Object v = body.get("recommandations");
            projet.setRecommandations(v == null ? null : v.toString());
        }
        projet.setUpdatedAt(LocalDateTime.now());

        eleve.setProjet(projet);
        eleveRepository.save(eleve);

        return ResponseEntity.ok(eleve);
    }

    // --- Présences ---

    @PostMapping("/{id}/presence/debut")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> demarrerSession(@PathVariable Long id, Authentication auth) {
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEleveModification((User) auth.getPrincipal(), eleveOpt.get());

        // Vérifier s'il y a déjà une session active
        Optional<Presence> activeOpt = presenceRepository.findByEleveIdAndSessionActiveTrue(id);
        if (activeOpt.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Une session est déjà active pour cet élève."));
        }

        Presence presence = Presence.builder()
                .eleveId(id)
                .date(LocalDate.now())
                .heureDebut(LocalDateTime.now())
                .sessionActive(true)
                .build();

        presenceRepository.save(presence);
        return ResponseEntity.ok(Map.of("success", true, "message", "Session de présence démarrée."));
    }

    @PostMapping("/{id}/presence/fin")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> terminerSession(@PathVariable Long id, Authentication auth) {
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEleveModification((User) auth.getPrincipal(), eleveOpt.get());

        Optional<Presence> activeOpt = presenceRepository.findByEleveIdAndSessionActiveTrue(id);
        if (activeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucune session active trouvée pour cet élève."));
        }

        Presence presence = activeOpt.get();
        presence.setHeureFin(LocalDateTime.now());
        presence.setSessionActive(false);

        long minutes = Duration.between(presence.getHeureDebut(), presence.getHeureFin()).toMinutes();
        presence.setDureeMinutes(minutes);
        presenceRepository.save(presence);

        // Cumuler les heures sur l'élève
        Eleve eleve = eleveOpt.get();
        double hoursAdded = minutes / 60.0;
        eleve.setTotalHeures((eleve.getTotalHeures() == null ? 0.0 : eleve.getTotalHeures()) + hoursAdded);
        eleveRepository.save(eleve);

        return ResponseEntity.ok(Map.of("success", true, "hoursAdded", hoursAdded));
    }

    // --- Commentaires ---

    @GetMapping("/{id}/commentaires")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'PARENT')")
    public ResponseEntity<List<Commentaire>> getCommentaires(@PathVariable Long id, Authentication auth) {
        centreAccessService.requireEleveAccess((User) auth.getPrincipal(), id);
        return ResponseEntity.ok(commentaireRepository.findByEleveIdOrderByCreatedAtDesc(id));
    }

    @GetMapping("/{id}/signalements")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<Signalement>> getSignalements(@PathVariable Long id, Authentication auth) {
        centreAccessService.requireEleveAccess((User) auth.getPrincipal(), id);
        List<Signalement> signalements = signalementRepository.findByEleveIdOrderByCreatedAtDesc(id);
        return ResponseEntity.ok(signalements);
    }

    @PostMapping("/{id}/commentaires")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> addCommentaire(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User auteur = (User) auth.getPrincipal();
        centreAccessService.requireEleveAccess(auteur, id);
        Commentaire commentaire = Commentaire.builder()
                .eleveId(id)
                .auteur(auteur)
                .contenu(com.nehemiahlab.platform.security.InputSanitizer.clean(body.get("contenu")))
                .build();

        return ResponseEntity.ok(commentaireRepository.save(commentaire));
    }

    // --- Signalements ---

    @PostMapping("/{id}/signalements")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> signalerEleve(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User auteur = (User) auth.getPrincipal();
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEleveAccess(auteur, id);

        Eleve eleve = eleveOpt.get();

        Signalement signalement = Signalement.builder()
                .eleveId(id)
                .centreId(eleve.getCentre() != null ? eleve.getCentre().getId() : null)
                .cibleType("ENFANT")
                .auteur(auteur)
                .description(body.get("description"))
                .inclureDansRapport(Boolean.parseBoolean(body.getOrDefault("inclureDansRapport", "false")))
                .priorite(body.getOrDefault("priorite", "NORMALE"))
                .defis(body.getOrDefault("defis", ""))
                .etatEquipements(body.getOrDefault("etatEquipements", ""))
                .statut("EN_ATTENTE")
                .build();

        signalementRepository.save(signalement);

        // Créer une notification pour le Directeur et le Coordinateur du centre
        List<User> admins = userRepository.findByRole(Role.DIRECTEUR);
        for (User admin : admins) {
            notificationRepository.save(Notification.builder()
                    .userId(admin.getId())
                    .titre("Signalement d'incident")
                    .message("L'élève " + eleve.getPrenom() + " " + eleve.getNom() + " a été signalé par " + auteur.getPrenom() + " " + auteur.getNom() + ".")
                    .type("SIGNALEMENT")
                    .lienId(signalement.getId())
                    .build());
        }

        if (eleve.getCentre().getCoordinateur() != null) {
            notificationRepository.save(Notification.builder()
                    .userId(eleve.getCentre().getCoordinateur().getId())
                    .titre("Signalement d'incident (Centre)")
                    .message("L'élève " + eleve.getPrenom() + " " + eleve.getNom() + " a été signalé par " + auteur.getPrenom() + " " + auteur.getNom() + ".")
                    .type("SIGNALEMENT")
                    .lienId(signalement.getId())
                    .build());
        }

        return ResponseEntity.ok(signalement);
    }
}
