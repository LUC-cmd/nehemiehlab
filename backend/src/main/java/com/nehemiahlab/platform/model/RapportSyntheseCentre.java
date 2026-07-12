package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rapport_synthese_centre")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RapportSyntheseCentre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "centre_id", nullable = false)
    private Long centreId;

    @Builder.Default
    @Column(name = "module_label", nullable = false)
    private String moduleLabel = "Module 01 : Apprendre à coder avec Scratch";

    private Integer annee;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "effectif_debut_filles")
    private Integer effectifDebutFilles;

    @Column(name = "effectif_debut_garcons")
    private Integer effectifDebutGarcons;

    @Column(name = "effectif_final_filles")
    private Integer effectifFinalFilles;

    @Column(name = "effectif_final_garcons")
    private Integer effectifFinalGarcons;

    @Column(name = "projets_libres_p1")
    private Integer projetsLibresP1;

    @Column(name = "projets_libres_p2")
    private Integer projetsLibresP2;

    @Column(name = "projets_non_acheves")
    private Integer projetsNonAcheves;

    @Column(name = "projets_groupe")
    private Integer projetsGroupe;

    @Column(name = "projets_contextuels")
    private Integer projetsContextuels;

    @Column(name = "projets_presentes")
    private Integer projetsPresentes;

    /** JSON : lignes de synthèse (défis, leçons, propositions par acteur) */
    @Column(name = "synthese_table", columnDefinition = "TEXT")
    private String syntheseTable;

    @Column(columnDefinition = "TEXT")
    private String aime;

    @Column(name = "pas_aime", columnDefinition = "TEXT")
    private String pasAime;

    @Column(columnDefinition = "TEXT")
    private String vision;

    @Column(name = "formateur_id")
    private Long formateurId;

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
