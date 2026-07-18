package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Message appartenant a une ConversationCiblee (voir ce type pour le contexte). */
@Entity
@Table(name = "messages_cibles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageCible {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    /** Id du message (de la meme conversation) auquel celui-ci repond, ou null. */
    @Column(name = "reponse_a_id")
    private Long reponseAId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
