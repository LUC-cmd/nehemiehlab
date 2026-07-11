package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "actualites")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Actualite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String resume;

    @Column(columnDefinition = "TEXT")
    private String contenu;

    private String imageUrl;

    /** EN_COURS, A_VENIR, TERMINE */
    @Column(nullable = false)
    @Builder.Default
    private String statut = "EN_COURS";

    private LocalDate dateDebut;
    private LocalDate dateFin;

    @Builder.Default
    private boolean actif = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
