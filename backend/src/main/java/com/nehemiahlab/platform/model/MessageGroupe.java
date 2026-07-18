package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_groupes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageGroupe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CanalDiscussion canal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    /** Id du message (du meme canal) auquel celui-ci repond, ou null. */
    @Column(name = "reponse_a_id")
    private Long reponseAId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
