package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.NotificationRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.service.NotificationDispatchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.nehemiahlab.platform.model.Notification;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationDispatchService notificationDispatchService;

    @GetMapping
    public ResponseEntity<List<Notification>> getMesNotifications(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @PutMapping("/{id}/lu")
    public ResponseEntity<?> marquerLu(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        Optional<Notification> notifOpt = notificationRepository.findById(id);

        if (notifOpt.isEmpty()) return ResponseEntity.notFound().build();

        Notification notif = notifOpt.get();
        if (!notif.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Non autorisé."));
        }

        notif.setLu(true);
        notificationRepository.save(notif);

        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/tous-lus")
    public ResponseEntity<?> marquerTousLus(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<Notification> unread = notificationRepository.findByUserIdAndLuFalseOrderByCreatedAtDesc(user.getId());
        
        for (Notification n : unread) {
            n.setLu(true);
        }
        notificationRepository.saveAll(unread);

        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Le directeur diffuse une alerte vers un ou plusieurs rôles (formateurs, comptable, etc.).
     * Notification in-app + email pour chaque destinataire.
     */
    @PostMapping("/diffuser")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> diffuser(@RequestBody Map<String, Object> body, Authentication auth) {
        User directeur = (User) auth.getPrincipal();
        String titre = InputSanitizer.cleanNullable((String) body.get("titre"));
        String message = InputSanitizer.cleanNullable((String) body.get("message"));
        if (titre == null || titre.isBlank() || message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Titre et message requis."));
        }

        @SuppressWarnings("unchecked")
        List<String> roleNames = body.get("roles") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of();

        if (roleNames.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sélectionnez au moins un destinataire."));
        }

        Long centreId = null;
        if (body.get("centreId") != null && !String.valueOf(body.get("centreId")).isBlank()) {
            centreId = Long.valueOf(String.valueOf(body.get("centreId")));
        }
        String cluster = body.get("cluster") != null ? String.valueOf(body.get("cluster")).trim() : null;

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
                return ResponseEntity.badRequest().body(Map.of("message", "Rôles invalides."));
            }

            recipients = notificationDispatchService.resolveRecipients(roles, centreId,
                    cluster != null && !cluster.isBlank() ? cluster : null);
        }

        String fullMessage = message + "\n\n— Message du Directeur " + directeur.getPrenom() + " " + directeur.getNom();
        notificationDispatchService.notifyMany(recipients, titre, fullMessage, "INFO", null);

        return ResponseEntity.ok(Map.of(
                "message", "Alerte envoyée à " + recipients.size() + " personne(s) (application + email + rappel bureau).",
                "destinataires", recipients.size()
        ));
    }
}
