package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
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


    @GetMapping("/centre/{centreId}")
    public ResponseEntity<List<Eleve>> getByCentre(@PathVariable Long centreId) {
        return ResponseEntity.ok(eleveRepository.findByCentreId(centreId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Eleve> getById(@PathVariable Long id) {
        return eleveRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User creator = (User) auth.getPrincipal();
        Long centreId = Long.valueOf(body.get("centreId").toString());
        Optional<Centre> centreOpt = centreRepository.findById(centreId);

        if (centreOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Centre non trouvé."));
        }

        Eleve eleve = Eleve.builder()
                .nom(body.get("nom").toString())
                .prenom(body.get("prenom").toString())
                .age(Integer.valueOf(body.get("age").toString()))
                .sexe(body.get("sexe").toString())
                .classe(body.get("classe").toString())
                .centre(centreOpt.get())
                .formateur(creator.getRole() == Role.FORMATEUR ? creator : null)
                .dateDebutFormation(LocalDate.parse(body.get("dateDebutFormation").toString()))
                .build();

        return ResponseEntity.ok(eleveRepository.save(eleve));
    }

    @PutMapping("/{id}/projet")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<?> updateProjet(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();

        Eleve eleve = eleveOpt.get();
        Projet projet = eleve.getProjet();

        if (projet == null) {
            projet = new Projet();
        }

        projet.setNom(body.get("nom").toString());
        projet.setDescription(body.get("description").toString());
        projet.setEvolution(Integer.valueOf(body.get("evolution").toString()));
        projet.setUpdatedAt(LocalDateTime.now());

        eleve.setProjet(projet);
        eleveRepository.save(eleve);

        return ResponseEntity.ok(eleve);
    }

    // --- Présences ---

    @PostMapping("/{id}/presence/debut")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> demarrerSession(@PathVariable Long id) {
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();

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
    public ResponseEntity<?> terminerSession(@PathVariable Long id) {
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();

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
        eleve.setTotalHeures(eleve.getTotalHeures() + hoursAdded);
        eleveRepository.save(eleve);

        return ResponseEntity.ok(Map.of("success", true, "hoursAdded", hoursAdded));
    }

    // --- Commentaires ---

    @PostMapping("/{id}/commentaires")
    public ResponseEntity<?> addCommentaire(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User auteur = (User) auth.getPrincipal();
        Commentaire commentaire = Commentaire.builder()
                .eleveId(id)
                .auteur(auteur)
                .contenu(body.get("contenu"))
                .build();

        return ResponseEntity.ok(commentaireRepository.save(commentaire));
    }

    // --- Signalements ---

    @PostMapping("/{id}/signalements")
    public ResponseEntity<?> signalerEleve(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User auteur = (User) auth.getPrincipal();
        Optional<Eleve> eleveOpt = eleveRepository.findById(id);
        if (eleveOpt.isEmpty()) return ResponseEntity.notFound().build();

        Eleve eleve = eleveOpt.get();

        Signalement signalement = Signalement.builder()
                .eleveId(id)
                .auteur(auteur)
                .description(body.get("description"))
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
