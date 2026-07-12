package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "projets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Projet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private Integer evolution = 0; // 0-100%

    /** Pourquoi le projet n'avance pas / n'est pas terminé */
    @Column(columnDefinition = "TEXT")
    private String causeNonAvancement;

    /** Justification pédagogique détaillée pour le rapport */
    @Column(columnDefinition = "TEXT")
    private String justificationPedagogique;

    /** Points forts observés chez l'enfant */
    @Column(columnDefinition = "TEXT")
    private String pointsForts;

    /** Recommandations / pistes d'amélioration */
    @Column(columnDefinition = "TEXT")
    private String recommandations;

    /** Problème illustré par le projet final (rapport annuel) */
    @Column(columnDefinition = "TEXT")
    private String probleme;

    /** Solution illustrée par le projet final (rapport annuel) */
    @Column(columnDefinition = "TEXT")
    private String solution;

    /** Médiocre, Passable, Assez-bien, Bien, Très-bien */
    @Column(name = "niveau_maitrise", length = 32)
    private String niveauMaitrise;

    /** Observations consolidées pour le rapport annuel */
    @Column(name = "observations_rapport", columnDefinition = "TEXT")
    private String observationsRapport;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
