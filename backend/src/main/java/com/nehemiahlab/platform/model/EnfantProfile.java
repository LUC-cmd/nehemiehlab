package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "enfant_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnfantProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nom;

    @Column(nullable = false, length = 120)
    private String prenom;

    private Integer age;

    /** Nom du centre (affichage) */
    @Column(length = 150)
    private String centre;

    private Long centreId;

    @Column(length = 120)
    private String region;

    @Column(length = 120)
    private String cluster;

    @Column(length = 2000)
    private String presentation;

    @Column(length = 500)
    private String pointsForts;

    private String photoUrl;

    /** Formateur / coordinateur / directeur ayant créé le profil */
    private Long createdByUserId;

    /** Lien optionnel vers l'élève métier (inscription / séances). */
    private Long eleveId;

    @Builder.Default
    private boolean actif = true;

    @OneToMany(mappedBy = "enfant", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("enfant")
    @Builder.Default
    private List<EnfantProject> projets = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
