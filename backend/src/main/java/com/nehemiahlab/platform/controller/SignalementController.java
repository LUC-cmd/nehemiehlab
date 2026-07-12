package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.NotificationDispatchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/signalements")
public class SignalementController {

    @Autowired
    private SignalementRepository signalementRepository;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private NotificationDispatchService notificationDispatchService;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'FORMATEUR')")
    public ResponseEntity<List<Signalement>> getAll(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<Signalement> signalements;

        if (user.getRole() == Role.DIRECTEUR) {
            signalements = signalementRepository.findAllByOrderByCreatedAtDesc();
        } else if (user.getRole() == Role.COORDINATEUR || user.getRole() == Role.RESPONSABLE_CLUSTER) {
            List<Centre> mesCentres = centreAccessService.accessibleCentres(user);
            List<Long> centreIds = mesCentres.stream().map(Centre::getId).toList();
            List<Long> eleveIds = mesCentres.stream()
                    .flatMap(c -> eleveRepository.findByCentreId(c.getId()).stream())
                    .map(Eleve::getId)
                    .collect(Collectors.toList());

            if (eleveIds.isEmpty()) {
                signalements = List.of();
            } else {
                signalements = signalementRepository.findByEleveIdInOrderByCreatedAtDesc(eleveIds);
            }
            signalements = signalements.stream()
                    .filter(s -> "ENFANT".equalsIgnoreCase(s.getCibleType()))
                    .filter(s -> (s.getCentreId() != null && centreIds.contains(s.getCentreId())) ||
                            (s.getEleveId() != null && eleveIds.contains(s.getEleveId())))
                    .toList();
        } else {
            List<Centre> mesCentres = centreRepository.findByFormateurId(user.getId());
            List<Long> centreIds = mesCentres.stream().map(Centre::getId).toList();
            List<Long> eleveIds = mesCentres.stream()
                    .flatMap(c -> eleveRepository.findByCentreId(c.getId()).stream())
                    .map(Eleve::getId)
                    .collect(Collectors.toList());
            signalements = signalementRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(s ->
                            ("ENFANT".equalsIgnoreCase(s.getCibleType()) &&
                                    ((s.getCentreId() != null && centreIds.contains(s.getCentreId())) ||
                                            (s.getEleveId() != null && eleveIds.contains(s.getEleveId()))))
                                    || (s.getAuteur() != null && s.getAuteur().getId().equals(user.getId())))
                    .toList();
        }

        signalements.forEach(this::enrichWithEleveInfo);
        return ResponseEntity.ok(signalements);
    }

    @PutMapping("/{id}/traiter")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> traiter(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        Optional<Signalement> signalementOpt = signalementRepository.findById(id);

        if (signalementOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Signalement signalement = signalementOpt.get();

        if (user.getRole() == Role.COORDINATEUR || user.getRole() == Role.RESPONSABLE_CLUSTER) {
            if (!"ENFANT".equalsIgnoreCase(signalement.getCibleType())) {
                return ResponseEntity.status(403).body(Map.of("message", "Seul le directeur peut traiter une alerte centre."));
            }
            if (signalement.getEleveId() == null || !centreAccessService.canAccessEleve(user, signalement.getEleveId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
            }
        }

        signalement.setStatut("TRAITE");
        signalementRepository.save(signalement);
        enrichWithEleveInfo(signalement);

        return ResponseEntity.ok(signalement);
    }

    @PostMapping("/centre")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'FORMATEUR')")
    public ResponseEntity<?> createAlerteCentre(@RequestBody Map<String, Object> body, Authentication auth) {
        User auteur = (User) auth.getPrincipal();
        if (body.get("centreId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le centre est requis."));
        }
        Long centreId = Long.valueOf(body.get("centreId").toString());
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        if (centreOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
        Centre centre = centreOpt.get();

        if (!canAccessCentre(auteur, centre)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous ne pouvez pas signaler ce centre."));
        }

        Signalement signalement = Signalement.builder()
                .centreId(centreId)
                .cibleType("CENTRE")
                .auteur(auteur)
                .description(readText(body.get("description")))
                .priorite(readText(body.getOrDefault("priorite", "NORMALE")))
                .etatEquipements(readText(body.get("etatEquipements")))
                .defis(readText(body.get("defis")))
                .statut("EN_ATTENTE")
                .inclureDansRapport(false)
                .build();
        signalementRepository.save(signalement);

        List<User> directeurs = userRepository.findByRole(Role.DIRECTEUR);
        String centreLabel = centre.getNom();
        String msg = "Alerte sur le centre " + centreLabel + " signalée par " + auteur.getPrenom() + " " + auteur.getNom() + ".";
        notificationDispatchService.notifyMany(directeurs, "Alerte centre", msg, "SIGNALEMENT", signalement.getId());

        enrichWithEleveInfo(signalement);
        return ResponseEntity.ok(signalement);
    }

    /**
     * Le directeur relaye une alerte vers les formateurs et/ou le comptable (in-app + email).
     */
    @PostMapping("/{id}/relayer")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> relayer(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        User directeur = (User) auth.getPrincipal();
        Optional<Signalement> signalementOpt = signalementRepository.findById(id);
        if (signalementOpt.isEmpty()) return ResponseEntity.notFound().build();

        Signalement signalement = signalementOpt.get();
        enrichWithEleveInfo(signalement);

        @SuppressWarnings("unchecked")
        List<String> roleNames = body.get("roles") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of("FORMATEUR");

        List<User> recipients;
        if (notificationDispatchService.isBroadcastAllRoles(roleNames)) {
            recipients = notificationDispatchService.resolveAllActiveUsers();
        } else {
            List<Role> roles = roleNames.stream()
                    .map(r -> {
                        try {
                            return Role.valueOf(r.trim().toUpperCase());
                        } catch (IllegalArgumentException e) {
                            return null;
                        }
                    })
                    .filter(r -> r != null)
                    .toList();

            if (roles.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Sélectionnez au moins un destinataire."));
            }

            Long centreId = signalement.getCentreId();
            if (centreId == null && signalement.getEleveId() != null) {
                centreId = eleveRepository.findById(signalement.getEleveId())
                        .map(e -> e.getCentre() != null ? e.getCentre().getId() : null)
                        .orElse(null);
            }

            recipients = notificationDispatchService.resolveRecipients(roles, centreId, null);
        }

        String cible = "ENFANT".equalsIgnoreCase(signalement.getCibleType())
                ? "élève " + signalement.getElevePrenom() + " " + signalement.getEleveNom()
                : "centre " + (signalement.getCentreNom() != null ? signalement.getCentreNom() : "");
        String priorite = "URGENTE".equalsIgnoreCase(signalement.getPriorite()) ? " [URGENT]" : "";
        String extra = body.get("message") != null ? "\n" + String.valueOf(body.get("message")).trim() : "";
        String msg = "Alerte terrain" + priorite + " concernant " + cible + " :\n"
                + signalement.getDescription() + extra
                + "\n\n— Relais du Directeur " + directeur.getPrenom() + " " + directeur.getNom();

        notificationDispatchService.notifyMany(recipients, "Alerte relayée par le Directeur", msg, "SIGNALEMENT", signalement.getId());

        return ResponseEntity.ok(Map.of(
                "message", "Alerte relayée à " + recipients.size() + " personne(s).",
                "destinataires", recipients.size()
        ));
    }

    @PutMapping("/{id}/inclusion-rapport")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'FORMATEUR')")
    public ResponseEntity<?> setInclusionRapport(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        Optional<Signalement> signalementOpt = signalementRepository.findById(id);
        if (signalementOpt.isEmpty()) return ResponseEntity.notFound().build();
        Signalement signalement = signalementOpt.get();

        if (!"ENFANT".equalsIgnoreCase(signalement.getCibleType())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cette option concerne uniquement les alertes enfant."));
        }

        boolean allowed = user.getRole() == Role.DIRECTEUR;
        if (!allowed && signalement.getCentreId() != null) {
            if (centreAccessService.canAccessCentre(user, signalement.getCentreId())) {
                allowed = user.getRole() == Role.COORDINATEUR
                        || user.getRole() == Role.RESPONSABLE_CLUSTER
                        || user.getRole() == Role.FORMATEUR;
            }
        }
        if (!allowed && signalement.getAuteur() != null && signalement.getAuteur().getId().equals(user.getId())) {
            allowed = true;
        }
        if (!allowed) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }

        boolean inclure = Boolean.parseBoolean(String.valueOf(body.getOrDefault("inclureDansRapport", false)));
        signalement.setInclureDansRapport(inclure);
        signalementRepository.save(signalement);
        enrichWithEleveInfo(signalement);
        return ResponseEntity.ok(signalement);
    }

    private boolean canAccessCentre(User user, Centre centre) {
        return centreAccessService.canAccessCentre(user, centre.getId());
    }

    private String readText(Object value) {
        if (value == null) return "";
        String text = String.valueOf(value).trim();
        return "null".equalsIgnoreCase(text) ? "" : text;
    }

    private void enrichWithEleveInfo(Signalement signalement) {
        if (signalement.getEleveId() != null) {
            eleveRepository.findById(signalement.getEleveId()).ifPresent(eleve -> {
                signalement.setEleveNom(eleve.getNom());
                signalement.setElevePrenom(eleve.getPrenom());
                if (eleve.getCentre() != null) {
                    signalement.setCentreNom(eleve.getCentre().getNom());
                }
            });
        } else if (signalement.getCentreId() != null) {
            centreRepository.findById(signalement.getCentreId()).ifPresent(c -> signalement.setCentreNom(c.getNom()));
        }
    }
}
