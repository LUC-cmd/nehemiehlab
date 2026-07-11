package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.service.RoleAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/access")
public class RoleAccessController {

    @Autowired
    private RoleAccessService roleAccessService;

    /** Catalogue des fonctionnalités + libellés pour l'UI Directeur */
    @GetMapping("/catalog")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> catalog() {
        List<Map<String, String>> features = List.of(
                feat("home", "Vue d'ensemble", "voir"),
                feat("centres", "Centres (tous)", "voir"),
                feat("mes-centres", "Mes centres", "voir"),
                feat("formateurs", "Formateurs", "voir"),
                feat("eleves", "Élèves", "voir"),
                feat("sessions", "Sessions", "voir"),
                feat("formations", "Formations / journal", "voir"),
                feat("transactions", "Transactions / paiements", "voir"),
                feat("rapports", "Rapports", "voir"),
                feat("publications", "Publications site", "voir"),
                feat("actualites", "Nouveautés", "voir"),
                feat("galerie", "Galerie site", "voir"),
                feat("ressources", "Ressources", "voir"),
                feat("communaute", "Communauté CEDJ", "voir"),
                feat("profils-enfants", "Profils enfants", "voir"),
                feat("controle-gestion", "Contrôle de gestion", "voir"),
                feat("utilisateurs", "Utilisateurs", "voir"),
                feat("signalements", "Signalements", "voir"),
                feat("permissions", "Permissions dashboards", "voir"),
                feat("profil", "Mon profil", "voir"),
                feat("edit_centre_location", "Modifier localisation centre", "modifier"),
                feat("create_eleve", "Inscrire un élève", "modifier"),
                feat("manage_sessions", "Démarrer / clôturer sessions", "modifier"),
                feat("validate_transactions", "Valider transactions", "modifier"),
                feat("manage_signalements", "Gérer signalements", "modifier")
        );

        List<String> roles = Arrays.stream(Role.values())
                .filter(r -> r != Role.DIRECTEUR) // Directeur géré à part (toujours complet)
                .map(Enum::name)
                .toList();

        return ResponseEntity.ok(Map.of(
                "features", features,
                "roles", roles,
                "locked", roleAccessService.lockedFeatures(),
                "defaults", roleAccessService.defaultMatrix()
        ));
    }

    @GetMapping("/matrix")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> getMatrix() {
        return ResponseEntity.ok(Map.of(
                "matrix", roleAccessService.getMatrix(),
                "locked", roleAccessService.lockedFeatures()
        ));
    }

    @PutMapping("/matrix")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> saveMatrix(@RequestBody Map<String, Collection<String>> body) {
        Map<String, Set<String>> saved = roleAccessService.saveMatrix(body);
        return ResponseEntity.ok(Map.of(
                "message", "Permissions mises à jour. Les comptes concernés verront les changements au prochain chargement.",
                "matrix", saved
        ));
    }

    /** Ce que le compte connecté a le droit de voir / faire */
    @GetMapping("/me")
    public ResponseEntity<?> myAccess(Authentication auth) {
        User user = (User) auth.getPrincipal();
        Set<String> features = roleAccessService.featuresFor(user.getRole());
        return ResponseEntity.ok(Map.of(
                "role", user.getRole().name(),
                "features", features
        ));
    }

    private static Map<String, String> feat(String id, String label, String kind) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("label", label);
        m.put("kind", kind);
        return m;
    }
}
