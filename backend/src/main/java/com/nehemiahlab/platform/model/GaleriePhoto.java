package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "galerie_photos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GaleriePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Légende affichée sur le site public */
    @Column(nullable = false, length = 500)
    private String legende;

    private String imageUrl;

    @Builder.Default
    private int ordre = 0;

    @Builder.Default
    private boolean actif = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
