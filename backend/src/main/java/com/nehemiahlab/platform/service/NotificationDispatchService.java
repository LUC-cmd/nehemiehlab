package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Notification;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.NotificationRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class NotificationDispatchService {

private static final Logger log = LoggerFactory.getLogger(NotificationDispatchService.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Value("${app.platform.url:http://localhost:5173}")
    private String platformUrl;

    public void notify(User recipient, String titre, String message, String type, Long lienId) {
        notify(recipient, titre, message, type, lienId, true);
    }

    /**
     * @param envoyerEmail si false, la notification reste temps reel (in-app + WebSocket)
     *                      uniquement, sans email — utilise pour les simples discussions
     *                      de groupe qui ne doivent pas generer d'email a chaque message.
     */
    public void notify(User recipient, String titre, String message, String type, Long lienId, boolean envoyerEmail) {
        if (recipient == null || recipient.getId() == null) return;
        Notification saved = notificationRepository.save(Notification.builder()
                .userId(recipient.getId())
                .titre(titre)
                .message(message)
                .type(type != null ? type : "INFO")
                .lienId(lienId)
                .build());
        if (envoyerEmail) {
            sendEmail(recipient, titre, message, type, lienId);
        }
        try {
            messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/notifications", saved);
        } catch (Exception e) {
            log.warn("Push WebSocket notification echoue pour {}: {}", recipient.getEmail(), e.getMessage());
        }
    }

    public void notifyMany(Collection<User> recipients, String titre, String message, String type, Long lienId) {
        notifyMany(recipients, titre, message, type, lienId, true);
    }

    /** Variante sans email — voir {@link #notify(User, String, String, String, Long, boolean)}. */
    public void notifyManyInApp(Collection<User> recipients, String titre, String message, String type, Long lienId) {
        notifyMany(recipients, titre, message, type, lienId, false);
    }

    public void notifyMany(Collection<User> recipients, String titre, String message, String type, Long lienId, boolean envoyerEmail) {
        if (recipients == null || recipients.isEmpty()) return;
        Map<Long, User> unique = new LinkedHashMap<>();
        for (User u : recipients) {
            if (u != null && u.getId() != null && u.isActif()) {
                unique.putIfAbsent(u.getId(), u);
            }
        }
        for (User u : unique.values()) {
            notify(u, titre, message, type, lienId, envoyerEmail);
        }
    }

    public void notifyRole(Role role, String titre, String message, String type, Long lienId) {
        notifyMany(userRepository.findByRoleAndActifTrue(role), titre, message, type, lienId);
    }

    /**
     * Résout les destinataires par rôles, avec filtre optionnel centre (formateurs/coordinateur du centre).
     */
    public List<User> resolveRecipients(List<Role> roles, Long centreId, String cluster) {
        Set<User> out = new LinkedHashSet<>();
        if (roles == null || roles.isEmpty()) return List.of();

        Centre centre = centreId != null ? centreRepository.findById(centreId).orElse(null) : null;

        for (Role role : roles) {
            if (role == null) continue;
            switch (role) {
                case FORMATEUR -> {
                    if (centre != null && centre.getFormateurs() != null) {
                        centre.getFormateurs().stream().filter(User::isActif).forEach(out::add);
                    } else if (cluster != null && !cluster.isBlank()) {
                        centreRepository.findByCluster(cluster).stream()
                                .flatMap(c -> c.getFormateurs() != null ? c.getFormateurs().stream() : java.util.stream.Stream.empty())
                                .filter(User::isActif)
                                .forEach(out::add);
                    } else {
                        userRepository.findByRoleAndActifTrue(Role.FORMATEUR).forEach(out::add);
                    }
                }
                case COMPTABLE -> userRepository.findByRoleAndActifTrue(Role.COMPTABLE).forEach(out::add);
                case COORDINATEUR -> {
                    if (centre != null && centre.getCoordinateur() != null && centre.getCoordinateur().isActif()) {
                        out.add(centre.getCoordinateur());
                    } else if (cluster != null && !cluster.isBlank()) {
                        centreRepository.findByCluster(cluster).stream()
                                .map(Centre::getCoordinateur)
                                .filter(u -> u != null && u.isActif())
                                .forEach(out::add);
                    } else {
                        userRepository.findByRoleAndActifTrue(Role.COORDINATEUR).forEach(out::add);
                    }
                }
                case RESPONSABLE_CLUSTER -> userRepository.findByRoleAndActifTrue(Role.RESPONSABLE_CLUSTER).forEach(out::add);
                case DIRECTEUR -> userRepository.findByRoleAndActifTrue(Role.DIRECTEUR).forEach(out::add);
                default -> userRepository.findByRoleAndActifTrue(role).forEach(out::add);
            }
        }
        return new ArrayList<>(out);
    }

    public List<User> resolveAllActiveUsers() {
        return userRepository.findAll().stream()
                .filter(User::isActif)
                .filter(u -> u.getRole() != Role.PARENT)
                .toList();
    }

    public boolean isBroadcastAllRoles(List<String> roleNames) {
        if (roleNames == null) return false;
        return roleNames.stream()
                .anyMatch(r -> r != null && ("TOUS".equalsIgnoreCase(r.trim()) || "ALL".equalsIgnoreCase(r.trim())));
    }

    public List<User> parseRoles(List<String> roleNames) {
        if (roleNames == null) return List.of();
        List<Role> roles = new ArrayList<>();
        for (String name : roleNames) {
            if (name == null || name.isBlank()) continue;
            try {
                roles.add(Role.valueOf(name.trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                /* skip unknown */
            }
        }
        return resolveRecipients(roles, null, null);
    }

    private void sendEmail(User user, String titre, String message, String type, Long lienId) {
        if (!user.isNotificationsEmailActives()) return;
        String email = user.getEmail();
        if (email == null || email.isBlank()) return;

        String lien = buildDeepLink(type, lienId);
        String body = "Bonjour " + safeName(user) + ",\n\n"
                + message + "\n\n";
        if (lien != null) {
            body += "Consulter sur la plateforme : " + lien + "\n\n";
        }
        body += "Vous recevez cet email car une alerte vous concerne sur Smart Kids Academy.\n"
                + "Connectez-vous à la plateforme pour plus de détails.\n\n"
                + "Smart Kids Academy — Nehemiah Lab";

        emailNotificationService.sendSafe(email, "[SKA] " + titre, body);
    }

    private String buildDeepLink(String type, Long lienId) {
        String base = platformUrl.endsWith("/") ? platformUrl.substring(0, platformUrl.length() - 1) : platformUrl;
        if (lienId == null) {
            return base + "/dashboard";
        }
        return switch (type != null ? type : "") {
            case "SIGNALEMENT" -> base + "/dashboard/signalements";
            case "TRANSACTION" -> base + "/dashboard/transactions";
            case "DISCUSSION" -> base + "/dashboard/discussion";
            default -> base + "/dashboard";
        };
    }

    private String safeName(User user) {
        return ((user.getPrenom() != null ? user.getPrenom() : "") + " "
                + (user.getNom() != null ? user.getNom() : "")).trim();
    }
}
