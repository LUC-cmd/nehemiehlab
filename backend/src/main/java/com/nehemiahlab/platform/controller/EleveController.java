package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.MatriculeService;
import com.nehemiahlab.platform.service.NotificationDispatchService;
import com.nehemiahlab.platform.service.ParentActivationService;
import com.nehemiahlab.platform.security.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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
    private NotificationDispatchService notificationDispatchService;

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

    @GetMapping("/{id}/seances")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> seancesEleve(@PathVariable Long id, Authentication auth) {
        centreAccessService.requireEleveAccess((User) auth.getPrincipal(), id);
        if (eleveRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> seances = evaluationSessionRepository.findByEleveId(id)
                .stream()
                .filter(ev -> ev.getSessionCours() != null)
                .sorted(Comparator.comparing(
                        (EvaluationSession ev) -> ev.getSessionCours().getHeureDebut(),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(ev -> {
                    var s = ev.getSessionCours();
                    Map<String, Object> row = new HashMap<>();
                    row.put("sessionId", s.getId());
                    row.put("titre", s.getTitre());
                    row.put("module", s.getModuleFait());
                    row.put("centre", s.getCentre() != null ? s.getCentre().getNom() : null);
                    row.put("date", s.getHeureDebut());
                    row.put("statut", s.getStatut());
                    row.put("present", ev.isPresent());
                    row.put("note", ev.getNote());
                    row.put("commentaire", ev.getCommentaire());
                    row.put("projetTravaille", ev.getProjetTravaille());
                    row.put("projetFinal", ev.isProjetFinal());
                    row.put("projetProbleme", ev.getProjetProbleme());
                    row.put("projetSolution", ev.getProjetSolution());
                    row.put("heureArrivee", ev.getHeureArrivee());
                    row.put("dureeMinutes", ev.getDureeMinutes());
                    return row;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(seances);
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

        String nomClean = com.nehemiahlab.platform.security.InputSanitizer.clean(body.get("nom").toString()).trim();
        String prenomClean = com.nehemiahlab.platform.security.InputSanitizer.clean(body.get("prenom").toString()).trim();

        // Date de naissance → âge calculé automatiquement
        LocalDate dateNaissance = null;
        int ageCalcule;
        if (body.get("dateNaissance") != null && !body.get("dateNaissance").toString().isBlank()) {
            dateNaissance = LocalDate.parse(body.get("dateNaissance").toString());
            ageCalcule = java.time.Period.between(dateNaissance, LocalDate.now()).getYears();
        } else if (body.get("age") != null) {
            ageCalcule = Integer.parseInt(body.get("age").toString());
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "La date de naissance est obligatoire."));
        }
        if (ageCalcule < 6 || ageCalcule > 22) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'âge calculé doit être entre 6 et 22 ans."));
        }

        // Anti-doublon : même nom + prénom dans le même centre (et même date de naissance si connue)
        final LocalDate dn = dateNaissance;
        boolean doublon = eleveRepository.findByCentreId(centreId).stream().anyMatch(e ->
                e.getNom() != null && e.getNom().equalsIgnoreCase(nomClean)
                && e.getPrenom() != null && e.getPrenom().equalsIgnoreCase(prenomClean)
                && (dn == null || e.getDateNaissance() == null || dn.equals(e.getDateNaissance())));
        if (doublon) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Doublon détecté : un élève avec le même nom et prénom existe déjà dans ce centre."));
        }

        Eleve eleve = Eleve.builder()
                .nom(nomClean)
                .prenom(prenomClean)
                .matricule(matricule)
                .age(ageCalcule)
                .dateNaissance(dateNaissance)
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

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        centreAccessService.requireEleveAccess(user, id);
        Eleve eleve = eleveRepository.findById(id).orElse(null);
        if (eleve == null) return ResponseEntity.notFound().build();

        if (body.containsKey("nom")) {
            String nom = InputSanitizer.clean(body.get("nom").toString()).trim();
            if (nom.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le nom est obligatoire."));
            }
            eleve.setNom(nom);
        }
        if (body.containsKey("prenom")) {
            String prenom = InputSanitizer.clean(body.get("prenom").toString()).trim();
            if (prenom.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le prénom est obligatoire."));
            }
            eleve.setPrenom(prenom);
        }
        if (body.get("dateNaissance") != null && !body.get("dateNaissance").toString().isBlank()) {
            LocalDate dn = LocalDate.parse(body.get("dateNaissance").toString());
            int age = java.time.Period.between(dn, LocalDate.now()).getYears();
            if (age < 6 || age > 22) {
                return ResponseEntity.badRequest().body(Map.of("message", "L'âge calculé doit être entre 6 et 22 ans."));
            }
            eleve.setDateNaissance(dn);
            eleve.setAge(age);
        } else if (body.containsKey("age")) {
            int age = Integer.parseInt(body.get("age").toString());
            if (age < 6 || age > 22) {
                return ResponseEntity.badRequest().body(Map.of("message", "L'âge doit être entre 6 et 22 ans."));
            }
            eleve.setAge(age);
        }
        if (body.containsKey("sexe")) {
            String sexe = body.get("sexe").toString();
            if (!"M".equals(sexe) && !"F".equals(sexe)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Sexe invalide (M ou F)."));
            }
            eleve.setSexe(sexe);
        }
        if (body.containsKey("classe")) {
            String classe = InputSanitizer.clean(body.get("classe").toString()).trim();
            if (classe.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "La classe est obligatoire."));
            }
            eleve.setClasse(classe);
        }
        if (body.containsKey("dateDebutFormation")) {
            eleve.setDateDebutFormation(LocalDate.parse(body.get("dateDebutFormation").toString()));
        }

        Eleve saved = eleveRepository.save(eleve);
        calculateAndSetPerformance(saved);
        return ResponseEntity.ok(saved);
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
        if (body.containsKey("probleme")) {
            Object v = body.get("probleme");
            projet.setProbleme(v == null ? null : v.toString());
        }
        if (body.containsKey("solution")) {
            Object v = body.get("solution");
            projet.setSolution(v == null ? null : v.toString());
        }
        if (body.containsKey("niveauMaitrise")) {
            Object v = body.get("niveauMaitrise");
            projet.setNiveauMaitrise(v == null ? null : v.toString());
        }
        if (body.containsKey("observationsRapport")) {
            Object v = body.get("observationsRapport");
            projet.setObservationsRapport(v == null ? null : v.toString());
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

        Long sessionId = null;
        if (body.get("sessionId") != null && !body.get("sessionId").isBlank()) {
            sessionId = Long.valueOf(body.get("sessionId"));
        }

        Signalement signalement = Signalement.builder()
                .eleveId(id)
                .centreId(eleve.getCentre() != null ? eleve.getCentre().getId() : null)
                .sessionId(sessionId)
                .cibleType("ENFANT")
                .auteur(auteur)
                .description(InputSanitizer.clean(body.get("description")))
                .inclureDansRapport(Boolean.parseBoolean(body.getOrDefault("inclureDansRapport", "false")))
                .priorite(body.getOrDefault("priorite", "NORMALE"))
                .defis(InputSanitizer.cleanNullable(body.getOrDefault("defis", "")))
                .etatEquipements(InputSanitizer.cleanNullable(body.getOrDefault("etatEquipements", "")))
                .statut("EN_ATTENTE")
                .build();

        signalementRepository.save(signalement);

        String eleveLabel = eleve.getPrenom() + " " + eleve.getNom();
        String auteurLabel = auteur.getPrenom() + " " + auteur.getNom();
        String priorite = "URGENTE".equalsIgnoreCase(signalement.getPriorite()) ? " [URGENT]" : "";
        String msg = "L'élève " + eleveLabel + " a été signalé" + priorite + " par " + auteurLabel + ".\n"
                + signalement.getDescription();

        notificationDispatchService.notifyRole(Role.DIRECTEUR, "Signalement d'incident", msg, "SIGNALEMENT", signalement.getId());

        if (eleve.getCentre() != null && eleve.getCentre().getCoordinateur() != null) {
            notificationDispatchService.notify(
                    eleve.getCentre().getCoordinateur(),
                    "Signalement d'incident (Centre)",
                    msg,
                    "SIGNALEMENT",
                    signalement.getId()
            );
        }

        return ResponseEntity.ok(signalement);
    }
}
