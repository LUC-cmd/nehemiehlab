package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.ConversationCiblee;
import com.nehemiahlab.platform.model.MessageCible;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.ConversationCibleeRepository;
import com.nehemiahlab.platform.repository.MessageCibleRepository;
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
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Conversations ciblees : deux modes possibles.
 *  - "Cible" (reserve au Directeur) : audience calculee par centre, cluster et/ou comptable
 *    (voir NotificationDispatchService.resolveRecipients) -- pas de gestion manuelle des membres,
 *    et le Directeur a toujours acces (supervision). C'est une alerte a sens unique : les
 *    destinataires la consultent et sont notifies en temps reel, mais seul le Directeur peut y
 *    ecrire (repondre). Le Directeur choisit, message par message, s'il veut aussi l'envoyer par
 *    email en plus de la notification temps reel (voir parametre "envoyerEmail").
 *  - "Libre" (style WhatsApp, ouvert a tous les roles du module discussion) : le createur
 *    choisit explicitement une ou plusieurs personnes precises. L'acces est alors strictement
 *    limite a cette liste de participants -- pas d'acces automatique pour le Directeur.
 *    Conversation a deux sens (tout participant peut repondre), toujours temps reel uniquement
 *    (jamais d'email automatique).
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
    private UserRepository userRepository;

    @Autowired
    private NotificationDispatchService notificationDispatchService;

    @Autowired
    private ThreadLectureService threadLectureService;

    /** Liste des conversations ciblees auxquelles l'utilisateur connecte a acces. */
    @GetMapping
    public ResponseEntity<?> getConversations(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<ConversationCiblee> toutes = conversationRepository.findAllByOrderByCreatedAtDesc();

        List<Map<String, Object>> visibles = new ArrayList<>();
        for (ConversationCiblee conv : toutes) {
            if (!aAcces(conv, user)) continue;
            visibles.add(toDto(conv, user));
        }
        return ResponseEntity.ok(visibles);
    }

    /** Contacts disponibles pour demarrer une conversation libre (tous les roles du module discussion, sauf soi-meme). */
    @GetMapping("/contacts")
    public ResponseEntity<?> getContacts(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<Map<String, Object>> contacts = new ArrayList<>();
        for (Role role : new Role[]{Role.DIRECTEUR, Role.FORMATEUR, Role.COMPTABLE}) {
            for (User u : userRepository.findByRoleAndActifTrue(role)) {
                if (u.getId() == null || u.getId().equals(user.getId())) continue;
                Map<String, Object> m = new HashMap<>();
                m.put("id", u.getId());
                m.put("prenom", u.getPrenom());
                m.put("nom", u.getNom());
                m.put("role", u.getRole().name());
                contacts.add(m);
            }
        }
        return ResponseEntity.ok(contacts);
    }

    /** Cree une conversation ciblee (mode "cible", Directeur uniquement) ou "libre" (tous roles) et son premier message. */
    @PostMapping
    public ResponseEntity<?> creerConversation(@RequestBody Map<String, Object> body, Authentication auth) {
        User createur = (User) auth.getPrincipal();

        Set<Long> participantIds = new LinkedHashSet<>();
        if (body.get("participantIds") instanceof List<?> rawList) {
            for (Object o : rawList) {
                try {
                    participantIds.add(Long.valueOf(String.valueOf(o)));
                } catch (NumberFormatException ignored) {
                    /* skip */
                }
            }
        }
        boolean libre = !participantIds.isEmpty();

        Long centreId = null;
        String cluster = null;
        boolean inclureComptable = false;

        if (!libre) {
            if (body.get("centreId") != null && !String.valueOf(body.get("centreId")).isBlank()) {
                try {
                    centreId = Long.valueOf(String.valueOf(body.get("centreId")));
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Centre invalide."));
                }
            }
            cluster = body.get("cluster") != null ? String.valueOf(body.get("cluster")).trim() : null;
            if (cluster != null && cluster.isBlank()) cluster = null;
            inclureComptable = Boolean.TRUE.equals(body.get("inclureComptable"))
                    || "true".equalsIgnoreCase(String.valueOf(body.get("inclureComptable")));
        }

        String contenu = InputSanitizer.clean((String) body.get("contenu"));
        if (contenu == null || contenu.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message ne peut pas être vide."));
        }
        if (contenu.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message est trop long (4000 caractères max)."));
        }

        String centreNom = null;
        ConversationCiblee.ConversationCibleeBuilder builder = ConversationCiblee.builder().createdBy(createur);

        if (libre) {
            // Discussion directe / de groupe libre : ouverte a tous les roles du module.
            if (centreId != null || cluster != null || inclureComptable) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "Choisissez soit des destinataires précis, soit un centre/cluster/comptable, pas les deux."));
            }
            participantIds.add(createur.getId());
            List<User> trouves = userRepository.findAllById(participantIds);
            if (trouves.size() != participantIds.size()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Un ou plusieurs destinataires sont introuvables."));
            }
            boolean valides = trouves.stream().allMatch(u -> u.isActif()
                    && (u.getRole() == Role.DIRECTEUR || u.getRole() == Role.FORMATEUR || u.getRole() == Role.COMPTABLE));
            if (!valides) {
                return ResponseEntity.badRequest().body(Map.of("message", "Destinataire invalide."));
            }
            builder.participantIds(participantIds);
        } else {
            // Ciblage par centre/cluster/comptable : reserve au Directeur.
            if (createur.getRole() != Role.DIRECTEUR) {
                return ResponseEntity.status(403).body(Map.of("message",
                        "Seul le Directeur peut cibler par centre, cluster ou comptable. Choisissez des destinataires précis."));
            }
            if (centreId == null && cluster == null && !inclureComptable) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "Sélectionnez au moins un destinataire : un centre, un cluster, ou le comptable."));
            }
            if (centreId != null) {
                Optional<Centre> centreOpt = centreRepository.findById(centreId);
                if (centreOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
                }
                centreNom = centreOpt.get().getNom();
            }
            builder.centreId(centreId).centreNom(centreNom).cluster(cluster).inclureComptable(inclureComptable);
        }

        boolean envoyerEmail = Boolean.TRUE.equals(body.get("envoyerEmail"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("envoyerEmail")));

        ConversationCiblee conv = conversationRepository.save(builder.build());

        MessageCible message = messageRepository.save(MessageCible.builder()
                .conversationId(conv.getId())
                .auteur(createur)
                .contenu(contenu)
                .build());

        notifierNouveauMessage(conv, createur, contenu, envoyerEmail);

        Map<String, Object> reponse = toDto(conv, createur);
        reponse.put("premierMessage", toMessageDto(message));
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
        return ResponseEntity.ok(recent.stream().map(this::toMessageDto).toList());
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> postMessage(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        ConversationCiblee conv = conversationRepository.findById(id).orElse(null);
        if (conv == null) return ResponseEntity.notFound().build();
        if (!aAcces(conv, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à cette conversation."));
        }
        if (!estLibre(conv) && user.getRole() != Role.DIRECTEUR) {
            return ResponseEntity.status(403).body(Map.of("message",
                    "Cette diffusion est une alerte du Directeur : vous pouvez la consulter mais pas y répondre."));
        }
        String contenu = InputSanitizer.clean((String) body.get("contenu"));
        if (contenu == null || contenu.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message ne peut pas être vide."));
        }
        if (contenu.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le message est trop long (4000 caractères max)."));
        }
        boolean envoyerEmail = Boolean.TRUE.equals(body.get("envoyerEmail"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("envoyerEmail")));

        // Reponse a un message precis (citation) : on ne garde la reference que si le
        // message vise existe reellement et appartient bien a cette meme conversation —
        // sinon on l'ignore silencieusement plutot que de rejeter l'envoi.
        Long reponseAId = extractId(body.get("reponseAId"));
        if (reponseAId != null) {
            MessageCible original = messageRepository.findById(reponseAId).orElse(null);
            if (original == null || !original.getConversationId().equals(id)) {
                reponseAId = null;
            }
        }

        MessageCible message = messageRepository.save(MessageCible.builder()
                .conversationId(id)
                .auteur(user)
                .contenu(contenu)
                .reponseAId(reponseAId)
                .build());

        notifierNouveauMessage(conv, user, contenu, envoyerEmail);

        return ResponseEntity.ok(toMessageDto(message));
    }

    /** Marque la conversation comme lue par l'utilisateur connecte (a chaque consultation). */
    @PostMapping("/{id}/lu")
    public ResponseEntity<?> marquerLu(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        ConversationCiblee conv = conversationRepository.findById(id).orElse(null);
        if (conv == null) return ResponseEntity.notFound().build();
        if (!aAcces(conv, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à cette conversation."));
        }
        threadLectureService.marquerLu("CONVERSATION", id.toString(), user);
        return ResponseEntity.ok().build();
    }

    /** Qui a deja consulte cette conversation et quand. */
    @GetMapping("/{id}/lecteurs")
    public ResponseEntity<?> getLecteurs(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        ConversationCiblee conv = conversationRepository.findById(id).orElse(null);
        if (conv == null) return ResponseEntity.notFound().build();
        if (!aAcces(conv, user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'avez pas accès à cette conversation."));
        }
        return ResponseEntity.ok(threadLectureService.getLecteurs("CONVERSATION", id.toString()));
    }

    /** Convertit un message en reponse JSON allegee : l'auteur est reduit aux champs
     * necessaires a l'affichage (id/prenom/nom/avatar/role) au lieu de l'entite User
     * complete, qui contient des donnees sensibles (IBAN, mobile money, piece d'identite,
     * adresse, telephone...) qui n'ont rien a faire dans une reponse de messagerie visible
     * par tous les participants de la conversation. */
    private Map<String, Object> toMessageDto(MessageCible m) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", m.getId());
        dto.put("conversationId", m.getConversationId());
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

    private boolean estLibre(ConversationCiblee conv) {
        return conv.getParticipantIds() != null && !conv.getParticipantIds().isEmpty();
    }

    /** Audience d'une conversation (participants explicites en mode libre, sinon calculee par criteres). */
    private List<User> resoudreParticipants(ConversationCiblee conv) {
        if (estLibre(conv)) {
            return userRepository.findAllById(conv.getParticipantIds()).stream()
                    .filter(User::isActif)
                    .toList();
        }
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
        if (!estLibre(conv) && user.getRole() == Role.DIRECTEUR) return true;
        return resoudreParticipants(conv).stream()
                .anyMatch(u -> u.getId() != null && u.getId().equals(user.getId()));
    }

    private void notifierNouveauMessage(ConversationCiblee conv, User auteur, String contenu, boolean envoyerEmail) {
        List<User> destinataires = resoudreParticipants(conv).stream()
                .filter(u -> u.getId() != null && !u.getId().equals(auteur.getId()))
                .toList();
        if (destinataires.isEmpty()) return;

        String apercu = contenu.length() > 200 ? contenu.substring(0, 200) + "…" : contenu;
        String titre = "Nouveau message" + (estLibre(conv) ? "" : " ciblé") + " — " + labelGenerique(conv);
        String messageNotif = (auteur.getPrenom() != null ? auteur.getPrenom() : "") + " "
                + (auteur.getNom() != null ? auteur.getNom() : "") + " : " + apercu;
        // Discussion libre (individuelle/petit groupe) : temps reel uniquement, jamais d'email
        // automatique. Diffusion ciblee (centre/cluster/comptable) : alerte a sens unique --
        // email seulement si le Directeur a coche "envoyer aussi par email" pour ce message.
        if (estLibre(conv) || !envoyerEmail) {
            notificationDispatchService.notifyManyInApp(destinataires, titre, messageNotif.trim(), "DISCUSSION", conv.getId());
        } else {
            notificationDispatchService.notifyMany(destinataires, titre, messageNotif.trim(), "DISCUSSION", conv.getId());
        }
    }

    /** DTO renvoye au frontend, avec un libelle et une liste "autres participants" propres au point de vue de l'utilisateur connecte. */
    private Map<String, Object> toDto(ConversationCiblee conv, User viewer) {
        boolean libre = estLibre(conv);
        Map<String, Object> m = new HashMap<>();
        m.put("id", conv.getId());
        m.put("libre", libre);
        m.put("label", label(conv, viewer));
        m.put("centreId", conv.getCentreId());
        m.put("centreNom", conv.getCentreNom());
        m.put("cluster", conv.getCluster());
        m.put("inclureComptable", conv.isInclureComptable());
        m.put("createdBy", conv.getCreatedBy() != null ? auteurDto(conv.getCreatedBy()) : null);
        m.put("createdAt", conv.getCreatedAt());
        long totalMessages = messageRepository.countByConversationId(conv.getId());
        m.put("nbMessages", totalMessages);
        // Nombre de messages non lus par le viewer : tous les messages si jamais ouverte,
        // sinon ceux arrives depuis son dernier acces a cette conversation.
        LocalDateTime dernierAcces = threadLectureService.getDernierAcces("CONVERSATION", conv.getId().toString(), viewer.getId());
        long nbNonLus = dernierAcces == null
                ? totalMessages
                : messageRepository.countByConversationIdAndCreatedAtAfter(conv.getId(), dernierAcces);
        m.put("nbNonLus", nbNonLus);
        m.put("peutRepondre", libre || viewer.getRole() == Role.DIRECTEUR);
        if (libre) {
            List<Map<String, Object>> autres = resoudreParticipants(conv).stream()
                    .filter(u -> u.getId() != null && !u.getId().equals(viewer.getId()))
                    .map(u -> {
                        Map<String, Object> p = new HashMap<>();
                        p.put("id", u.getId());
                        p.put("prenom", u.getPrenom());
                        p.put("nom", u.getNom());
                        p.put("role", u.getRole().name());
                        return p;
                    })
                    .toList();
            m.put("participants", autres);
        }
        return m;
    }

    private String label(ConversationCiblee conv, User viewer) {
        if (estLibre(conv)) {
            List<User> autres = resoudreParticipants(conv).stream()
                    .filter(u -> u.getId() != null && !u.getId().equals(viewer.getId()))
                    .toList();
            if (autres.isEmpty()) return "Notes personnelles";
            return nomsCourts(autres);
        }
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

    /** Libelle neutre (non lie a un point de vue precis), utilise pour le titre des notifications. */
    private String labelGenerique(ConversationCiblee conv) {
        if (estLibre(conv)) {
            return nomsCourts(resoudreParticipants(conv));
        }
        return label(conv, conv.getCreatedBy());
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

    private String nomsCourts(List<User> utilisateurs) {
        List<String> noms = utilisateurs.stream()
                .limit(3)
                .map(u -> ((u.getPrenom() != null ? u.getPrenom() : "") + " " + (u.getNom() != null ? u.getNom() : "")).trim())
                .toList();
        String joint = String.join(", ", noms);
        if (utilisateurs.size() > 3) joint += "…";
        return joint.isBlank() ? "Discussion" : joint;
    }
}
