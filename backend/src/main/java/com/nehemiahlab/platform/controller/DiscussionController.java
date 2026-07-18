package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.CanalDiscussion;
import com.nehemiahlab.platform.model.MessageGroupe;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.MessageGroupeRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
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
        List<MessageGroupe> messages = messageGroupeRepository.findByCanalOrderByCreatedAtAsc(c);
        return ResponseEntity.ok(messages);
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

        return ResponseEntity.ok(messageGroupeRepository.save(message));
    }

    private CanalDiscussion parseCanal(String raw) {
        try {
            return CanalDiscussion.valueOf(raw);
        } catch (Exception e) {
            return null;
        }
    }
}
