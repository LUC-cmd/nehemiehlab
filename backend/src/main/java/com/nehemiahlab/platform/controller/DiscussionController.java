package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.CanalDiscussion;
import com.nehemiahlab.platform.model.ConversationCiblee;
import com.nehemiahlab.platform.model.MessageGroupe;
import com.nehemiahlab.platform.model.Notification;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.ConversationCibleeRepository;
import com.nehemiahlab.platform.repository.MessageCibleRepository;
import com.nehemiahlab.platform.repository.MessageGroupeRepository;
import com.nehemiahlab.platform.repository.NotificationRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.service.NotificationDispatchService;
import com.nehemiahlab.platform.service.ThreadLectureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    @Autowired
    private ConversationCibleeRepository conversationRepository;

    @Autowired
    private MessageCibleRepository messageCibleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

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
                    // Nombre de messages non lus : tous les messages si l'utilisateur n'a
                    // jamais ouvert ce canal, sinon ceux arrives depuis son dernier acces.
                    LocalDateTime dernierAcces = threadLectureService.getDernierAcces("CANAL", c.name(), user.getId());
                    long nbNonLus = dernierAcces == null
                            ? messageGroupeRepository.countByCanal(c)
                            : messageGroupeRepository.countByCanalAndCreatedAtAfter(c, dernierAcces);
                    m.put("nbNonLus", nbNonLus);
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
        return ResponseEntity.ok(recent.stream().map(this::toDto).toList());
    }

    @PostMapping("/{canal}/messages")
    public ResponseEntity<?> postMessage(@PathVariable String canal, @RequestBody Map<String, Object> body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        CanalDiscussion c = parseCanal(canal);
        if (c == null) {
            return ResponseEntity.notFound().build();
        }
        if (!c.accessiblePar(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à ce groupe de discussion."));
        }
        String contenu = InputSanitizer.clean((String) body.get("contenu"));
        if (contenu == null || contenu.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message ne peut pas être vide."));
        }
        if (contenu.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message est trop long (4000 caractères max)."));
        }

        // Reponse a un message precis (citation) : on ne garde la reference que si le
        // message vise existe reellement et appartient bien a ce meme canal — sinon on
        // l'ignore silencieusement plutot que de rejeter l'envoi.
        Long reponseAId = extractId(body.get("reponseAId"));
        if (reponseAId != null) {
            MessageGroupe original = messageGroupeRepository.findById(reponseAId).orElse(null);
            if (original == null || original.getCanal() != c) {
                reponseAId = null;
            }
        }

        MessageGroupe message = MessageGroupe.builder()
                .canal(c)
                .auteur(user)
                .contenu(contenu)
                .reponseAId(reponseAId)
                .build();
        MessageGroupe saved = messageGroupeRepository.save(message);

        notifierNouveauMessage(c, user, contenu);

        return ResponseEntity.ok(toDto(saved));
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
        // L'utilisateur vient de consulter ce canal : ses notifications DISCUSSION de canal
        // (lienId null — les notifications de conversation portent l'id de la conversation)
        // sont marquees lues automatiquement, sans qu'il ait besoin de les ouvrir une par une.
        List<Notification> aMarquer = notificationRepository
                .findByUserIdAndTypeAndLuFalse(user.getId(), "DISCUSSION").stream()
                .filter(n -> n.getLienId() == null)
                .toList();
        if (!aMarquer.isEmpty()) {
            aMarquer.forEach(n -> n.setLu(true));
            notificationRepository.saveAll(aMarquer);
        }
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

    /**
     * Nombre total de messages non lus (canaux + conversations) pour le badge de la barre
     * du haut. Volontairement leger : uniquement des COUNT, pas de chargement de messages.
     * Distinct des notifications : ce badge reflete l'etat reel de lecture des fils.
     */
    @GetMapping("/non-lus")
    public ResponseEntity<?> getNonLus(Authentication auth) {
        User user = (User) auth.getPrincipal();
        long total = 0;

        for (CanalDiscussion c : CanalDiscussion.values()) {
            if (!c.accessiblePar(user.getRole())) continue;
            LocalDateTime dernierAcces = threadLectureService.getDernierAcces("CANAL", c.name(), user.getId());
            total += dernierAcces == null
                    ? messageGroupeRepository.countByCanal(c)
                    : messageGroupeRepository.countByCanalAndCreatedAtAfter(c, dernierAcces);
        }

        for (ConversationCiblee conv : conversationRepository.findAllByOrderByCreatedAtDesc()) {
            if (!aAccesConversation(conv, user)) continue;
            LocalDateTime dernierAcces = threadLectureService.getDernierAcces(
                    "CONVERSATION", conv.getId().toString(), user.getId());
            total += dernierAcces == null
                    ? messageCibleRepository.countByConversationId(conv.getId())
                    : messageCibleRepository.countByConversationIdAndCreatedAtAfter(conv.getId(), dernierAcces);
        }

        return ResponseEntity.ok(Map.of("total", total));
    }

    /** Meme regle d'acces que ConversationCibleeController.aAcces (participants explicites en
     * mode libre, audience calculee par criteres sinon, Directeur toujours inclus hors mode libre). */
    private boolean aAccesConversation(ConversationCiblee conv, User user) {
        boolean libre = conv.getParticipantIds() != null && !conv.getParticipantIds().isEmpty();
        if (!libre && user.getRole() == Role.DIRECTEUR) return true;
        List<User> participants;
        if (libre) {
            participants = userRepository.findAllById(conv.getParticipantIds()).stream()
                    .filter(User::isActif)
                    .toList();
        } else {
            List<Role> roles = new ArrayList<>();
            roles.add(Role.DIRECTEUR);
            if (conv.getCentreId() != null || conv.getCluster() != null) {
                roles.add(Role.FORMATEUR);
            }
            if (conv.isInclureComptable()) {
                roles.add(Role.COMPTABLE);
            }
            participants = notificationDispatchService.resolveRecipients(roles, conv.getCentreId(), conv.getCluster());
        }
        return participants.stream().anyMatch(u -> u.getId() != null && u.getId().equals(user.getId()));
    }

    /** Convertit un message en reponse JSON allegee : l'auteur est reduit aux champs
     * necessaires a l'affichage (id/prenom/nom/avatar/role) au lieu de l'entite User
     * complete, qui contient des donnees sensibles (IBAN, mobile money, piece d'identite,
     * adresse, telephone...) qui n'ont rien a faire dans une reponse de messagerie visible
     * par tous les membres du canal. */
    private Map<String, Object> toDto(MessageGroupe m) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", m.getId());
        dto.put("canal", m.getCanal());
        dto.put("auteur", auteurDto(m.getAuteur()));
        dto.put("contenu", m.getContenu());
        dto.put("reponseAId", m.getReponseAId());
        dto.put("createdAt", m.getCreatedAt());
        return dto;
    }

    private Map<String, Object> auteurDto(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("prenom", u.getPrenom());
        m.put("nom", u.getNom());
        m.put("avatar", u.getAvatar());
        m.put("role", u.getRole());
        return m;
    }

    private CanalDiscussion parseCanal(String raw) {
        try {
            return CanalDiscussion.valueOf(raw);
        } catch (Exception e) {
            return null;
        }
    }

    /** Extrait un id (Long) depuis une valeur JSON deserialisee en Object (Number ou String). */
    private Long extractId(Object raw) {
        if (raw instanceof Number n) {
            return n.longValue();
        }
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
