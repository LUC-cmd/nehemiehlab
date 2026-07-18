package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.CanalDiscussion;
import com.nehemiahlab.platform.model.MessageGroupe;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.MessageGroupeRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.service.NotificationDispatchService;
import com.nehemiahlab.platform.service.ThreadLectureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Groupes de discussion internes entre formateurs, directeur et comptable.
 * Les canaux sont fixes (voir CanalDiscussion) et l'appartenance est deduite
 * automatiquement du role de l'utilisateur connecte — pas de gestion manuelle
 * des membres.
 */
@RestController
@RequestMapping("/discussion")
@PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COMPTABLE')")
public class DiscussionController {

    @Autowired
    private MessageGroupeRepository messageGroupeRepository;

    @Autowired
    private NotificationDispatchService notificationDispatchService;

    @Autowired
    private ThreadLectureService threadLectureService;

    /** Liste des canaux auxquels l'utilisateur connecte a accès, avec le nombre de messages. */
    @GetMapping("/canaux")
    public ResponseEntity<?> getCanaux(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<Map<String, Object>> canaux = Arrays.stream(CanalDiscussion.values())
                .filter(c -> c.accessiblePar(user.getRole()))
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("canal", c.name());
                    m.put("label", c.label());
                    m.put("nbMessages", messageGroupeRepository.countByCanal(c));
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(canaux);
    }

    @GetMapping("/{canal}/messages")
    public ResponseEntity<?> getMessages(@PathVariable String canal, Authentication auth) {
        User user = (User) auth.getPrincipal();
        CanalDiscussion c = parseCanal(canal);
        if (c == null) {
            return ResponseEntity.notFound().build();
        }
        if (!c.accessiblePar(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à ce groupe de discussion."));
        }
        // On ne charge que les 200 derniers messages (l'historique complet n'est
        // pas nécessaire et cet endpoint est interrogé toutes les 8 secondes).
        List<MessageGroupe> recent = messageGroupeRepository.findTop200ByCanalOrderByCreatedAtDesc(c);
        Collections.reverse(recent);
        return ResponseEntity.ok(recent);
    }

    @PostMapping("/{canal}/messages")
    public ResponseEntity<?> postMessage(@PathVariable String canal, @RequestBody Map<String, String> body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        CanalDiscussion c = parseCanal(canal);
        if (c == null) {
            return ResponseEntity.notFound().build();
        }
        if (!c.accessiblePar(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à ce groupe de discussion."));
        }
        String contenu = InputSanitizer.clean(body.get("contenu"));
        if (contenu == null || contenu.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message ne peut pas être vide."));
        }
        if (contenu.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message est trop long (4000 caractères max)."));
        }

        MessageGroupe message = MessageGroupe.builder()
                .canal(c)
                .auteur(user)
                .contenu(contenu)
                .build();
        MessageGroupe saved = messageGroupeRepository.save(message);

        notifierNouveauMessage(c, user, contenu);

        return ResponseEntity.ok(saved);
    }

    /** Notifie (in-app temps reel + email) les autres membres du canal qu'un nouveau message a ete poste. */
    private void notifierNouveauMessage(CanalDiscussion c, User auteur, String contenu) {
        List<User> destinataires = notificationDispatchService.resolveRecipients(c.roles(), null, null).stream()
                .filter(u -> u.getId() != null && !u.getId().equals(auteur.getId()))
                .toList();
        if (destinataires.isEmpty()) return;

        String apercu = contenu.length() > 200 ? contenu.substring(0, 200) + "…" : contenu;
        String titre = "Nouveau message — " + c.label();
        String messageNotif = (auteur.getPrenom() != null ? auteur.getPrenom() : "") + " "
                + (auteur.getNom() != null ? auteur.getNom() : "") + " : " + apercu;
        // Groupes de discussion internes : temps reel uniquement (pas d'email par message).
        notificationDispatchService.notifyManyInApp(destinataires, titre, messageNotif.trim(), "DISCUSSION", null);
    }

    /** Marque le canal comme lu par l'utilisateur connecte (a chaque consultation). */
    @PostMapping("/{canal}/lu")
    public ResponseEntity<?> marquerLu(@PathVariable String canal, Authentication auth) {
        User user = (User) auth.getPrincipal();
        CanalDiscussion c = parseCanal(canal);
        if (c == null) {
            return ResponseEntity.notFound().build();
        }
        if (!c.accessiblePar(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à ce groupe de discussion."));
        }
        threadLectureService.marquerLu("CANAL", canal, user);
        return ResponseEntity.ok().build();
    }

    /** Qui a deja consulte ce canal et quand (sert a calculer, cote client, qui a lu chaque message). */
    @GetMapping("/{canal}/lecteurs")
    public ResponseEntity<?> getLecteurs(@PathVariable String canal, Authentication auth) {
        User user = (User) auth.getPrincipal();
        CanalDiscussion c = parseCanal(canal);
        if (c == null) {
            return ResponseEntity.notFound().build();
        }
        if (!c.accessiblePar(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à ce groupe de discussion."));
        }
        return ResponseEntity.ok(threadLectureService.getLecteurs("CANAL", canal));
    }

    private CanalDiscussion parseCanal(String raw) {
        try {
            return CanalDiscussion.valueOf(raw);
        } catch (Exception e) {
            return null;
        }
    }
}
