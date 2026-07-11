package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "publications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Publication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** IMAGE, VIDEO, TEXTE */
    @Column(nullable = false)
    private String type;

    /** URL fichier image/vidéo uploadé */
    private String mediaUrl;

    /** Lien YouTube ou externe pour les vidéos */
    private String lienExterne;

    @Column(columnDefinition = "TEXT")
    private String contenu;

    @Builder.Default
    private boolean actif = true;

    @Builder.Default
    private Integer ordre = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
