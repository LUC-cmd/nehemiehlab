package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.ConversationCiblee;
import com.nehemiahlab.platform.model.MessageCible;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.ConversationCibleeRepository;
import com.nehemiahlab.platform.repository.MessageCibleRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.service.NotificationDispatchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Conversations ciblees : en plus des 4 canaux fixes (voir DiscussionController),
 * le Directeur peut ouvrir une discussion avec une audience precise --
 * les formateurs d'un centre, d'un cluster, et/ou le comptable (y compris
 * une discussion directe Directeur <-> Comptable seul).
 * L'appartenance est recalculee a la volee via NotificationDispatchService.resolveRecipients,
 * la meme logique qui sert deja a la diffusion d'alertes -- pas de table de membres.
 */
@RestController
@RequestMapping("/discussion/conversations")
@PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COMPTABLE')")
public class ConversationCibleeController {

    @Autowired
    private ConversationCibleeRepository conversationRepository;

    @Autowired
    private MessageCibleRepository messageRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private NotificationDispatchService notificationDispatchService;

    /** Liste des conversations ciblees auxquelles l'utilisateur connecte a acces. */
    @GetMapping
    public ResponseEntity<?> getConversations(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<ConversationCiblee> toutes = conversationRepository.findAllByOrderByCreatedAtDesc();

        List<Map<String, Object>> visibles = new ArrayList<>();
        for (ConversationCiblee conv : toutes) {
            if (!aAcces(conv, user)) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("id", conv.getId());
            m.put("label", label(conv));
            m.put("centreId", conv.getCentreId());
            m.put("centreNom", conv.getCentreNom());
            m.put("cluster", conv.getCluster());
            m.put("inclureComptable", conv.isInclureComptable());
            m.put("createdBy", conv.getCreatedBy());
            m.put("createdAt", conv.getCreatedAt());
            m.put("nbMessages", messageRepository.countByConversationId(conv.getId()));
            visibles.add(m);
        }
        return ResponseEntity.ok(visibles);
    }

    /** Cree une conversation ciblee et son premier message (Directeur uniquement). */
    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> creerConversation(@RequestBody Map<String, Object> body, Authentication auth) {
        User directeur = (User) auth.getPrincipal();

        Long centreId = null;
        if (body.get("centreId") != null && !String.valueOf(body.get("centreId")).isBlank()) {
            try {
                centreId = Long.valueOf(String.valueOf(body.get("centreId")));
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Centre invalide."));
            }
        }
        String cluster = body.get("cluster") != null ? String.valueOf(body.get("cluster")).trim() : null;
        if (cluster != null && cluster.isBlank()) cluster = null;
        boolean inclureComptable = Boolean.TRUE.equals(body.get("inclureComptable"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("inclureComptable")));

        if (centreId != null && cluster != null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Choisissez un centre OU un cluster, pas les deux."));
        }
        if (centreId == null && cluster == null && !inclureComptable) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Sélectionnez au moins un destinataire : un centre, un cluster, ou le comptable."));
        }

        String centreNom = null;
        if (centreId != null) {
            Optional<Centre> centreOpt = centreRepository.findById(centreId);
            if (centreOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
            }
            centreNom = centreOpt.get().getNom();
        }

        String contenu = InputSanitizer.clean((String) body.get("contenu"));
        if (contenu == null || contenu.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message ne peut pas être vide."));
        }
        if (contenu.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message est trop long (4000 caractères max)."));
        }

        ConversationCiblee conv = conversationRepository.save(ConversationCiblee.builder()
                .centreId(centreId)
                .centreNom(centreNom)
                .cluster(cluster)
                .inclureComptable(inclureComptable)
                .createdBy(directeur)
                .build());

        MessageCible message = messageRepository.save(MessageCible.builder()
                .conversationId(conv.getId())
                .auteur(directeur)
                .contenu(contenu)
                .build());

        notifierNouveauMessage(conv, directeur, contenu);

        Map<String, Object> reponse = new HashMap<>();
        reponse.put("id", conv.getId());
        reponse.put("label", label(conv));
        reponse.put("centreId", conv.getCentreId());
        reponse.put("centreNom", conv.getCentreNom());
        reponse.put("cluster", conv.getCluster());
        reponse.put("inclureComptable", conv.isInclureComptable());
        reponse.put("createdAt", conv.getCreatedAt());
        reponse.put("premierMessage", message);
        return ResponseEntity.ok(reponse);
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        ConversationCiblee conv = conversationRepository.findById(id).orElse(null);
        if (conv == null) return ResponseEntity.notFound().build();
        if (!aAcces(conv, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à cette conversation."));
        }
        List<MessageCible> recent = messageRepository.findTop200ByConversationIdOrderByCreatedAtDesc(id);
        Collections.reverse(recent);
        return ResponseEntity.ok(recent);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> postMessage(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        ConversationCiblee conv = conversationRepository.findById(id).orElse(null);
        if (conv == null) return ResponseEntity.notFound().build();
        if (!aAcces(conv, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à cette conversation."));
        }
        String contenu = InputSanitizer.clean(body.get("contenu"));
        if (contenu == null || contenu.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message ne peut pas être vide."));
        }
        if (contenu.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message est trop long (4000 caractères max)."));
        }

        MessageCible message = messageRepository.save(MessageCible.builder()
                .conversationId(id)
                .auteur(user)
                .contenu(contenu)
                .build());

        notifierNouveauMessage(conv, user, contenu);

        return ResponseEntity.ok(message);
    }

    /** Audience d'une conversation ciblee (Directeurs toujours inclus, + formateurs/comptable selon les criteres). */
    private List<User> resoudreParticipants(ConversationCiblee conv) {
        List<Role> roles = new ArrayList<>();
        roles.add(Role.DIRECTEUR);
        if (conv.getCentreId() != null || conv.getCluster() != null) {
            roles.add(Role.FORMATEUR);
        }
        if (conv.isInclureComptable()) {
            roles.add(Role.COMPTABLE);
        }
        return notificationDispatchService.resolveRecipients(roles, conv.getCentreId(), conv.getCluster());
    }

    private boolean aAcces(ConversationCiblee conv, User user) {
        if (user.getRole() == Role.DIRECTEUR) return true;
        return resoudreParticipants(conv).stream()
                .anyMatch(u -> u.getId() != null && u.getId().equals(user.getId()));
    }

    private void notifierNouveauMessage(ConversationCiblee conv, User auteur, String contenu) {
        List<User> destinataires = resoudreParticipants(conv).stream()
                .filter(u -> u.getId() != null && !u.getId().equals(auteur.getId()))
                .toList();
        if (destinataires.isEmpty()) return;

        String apercu = contenu.length() > 200 ? contenu.substring(0, 200) + "…" : contenu;
        String titre = "Nouveau message ciblé — " + label(conv);
        String messageNotif = (auteur.getPrenom() != null ? auteur.getPrenom() : "") + " "
                + (auteur.getNom() != null ? auteur.getNom() : "") + " : " + apercu;
        notificationDispatchService.notifyMany(destinataires, titre, messageNotif.trim(), "DISCUSSION", conv.getId());
    }

    private String label(ConversationCiblee conv) {
        String base;
        boolean cible = conv.getCentreId() != null || (conv.getCluster() != null && !conv.getCluster().isBlank());
        if (conv.getCentreId() != null) {
            base = "Formateurs — " + (conv.getCentreNom() != null ? conv.getCentreNom() : ("Centre #" + conv.getCentreId()));
        } else if (conv.getCluster() != null && !conv.getCluster().isBlank()) {
            base = "Formateurs — Cluster " + conv.getCluster();
        } else {
            base = "Directeur ↔ Comptable";
        }
        if (cible && conv.isInclureComptable()) {
            base += " + Comptable";
        }
        return base;
    }
}
