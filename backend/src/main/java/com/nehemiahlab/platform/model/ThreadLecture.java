package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Marque d'accès en lecture d'un utilisateur sur un fil de discussion (canal ou
 * conversation ciblée/libre). Une seule ligne par (threadType, threadKey, userId),
 * mise à jour à chaque consultation. Sert à calculer, message par message, qui l'a
 * déjà lu (dernierAcces >= createdAt du message) sans stocker un statut par message.
 */
@Entity
@Table(name = "thread_lectures", uniqueConstraints = @UniqueConstraint(
        name = "uk_thread_lecture", columnNames = {"thread_type", "thread_key", "user_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreadLecture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** "CANAL" ou "CONVERSATION" */
    @Column(name = "thread_type", nullable = false, length = 20)
    private String threadType;

    /** Nom du canal (CanalDiscussion) ou id de la ConversationCiblee (en texte) */
    @Column(name = "thread_key", nullable = false, length = 64)
    private String threadKey;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "dernier_acces", nullable = false)
    private LocalDateTime dernierAcces;
}
