package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Notification;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

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
}
