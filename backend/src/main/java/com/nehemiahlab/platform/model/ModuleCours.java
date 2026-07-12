package com.nehemiahlab.platform.model;



import jakarta.persistence.*;

import lombok.*;



import java.time.LocalDateTime;



/**

 * Module pédagogique SKA — défini par le Directeur, consulté par les formateurs.

 */

@Entity

@Table(name = "modules_cours")

@Data

@Builder

@NoArgsConstructor

@AllArgsConstructor

public class ModuleCours {



    @Id

    @GeneratedValue(strategy = GenerationType.IDENTITY)

    private Long id;



    @Column(nullable = false)

    private Integer numeroOrdre;



    @Column(nullable = false, length = 200)

    private String titre;



    @Column(columnDefinition = "TEXT")

    private String description;



    @Column(columnDefinition = "TEXT")

    private String objectifs;



    /** Durée conseillée pour enseigner ce module (heures) */

    private Double dureeRecommandeeHeures;



    /** Niveau ou classe cible (ex. Débutant, CM1…) */

    @Column(length = 80)

    private String niveau;



    @Builder.Default

    private boolean actif = true;



    @Builder.Default

    private LocalDateTime createdAt = LocalDateTime.now();



    @Builder.Default

    private LocalDateTime updatedAt = LocalDateTime.now();



    @PreUpdate

    public void onUpdate() {

        updatedAt = LocalDateTime.now();

    }

}

