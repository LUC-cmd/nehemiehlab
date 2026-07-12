package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "signalements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Signalement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private Long eleveId;

    @Column
    private Long centreId;

    /** Séance terrain liée (alerte saisie pendant une session) */
    @Column(name = "session_id")
    private Long sessionId;

    @Column(nullable = false)
    @Builder.Default
    private String cibleType = "ENFANT"; // "ENFANT", "CENTRE"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String statut = "EN_ATTENTE"; // "EN_ATTENTE", "TRAITE"

    @Column(nullable = false)
    @Builder.Default
    private boolean inclureDansRapport = false;

    @Column(nullable = false)
    @Builder.Default
    private String priorite = "NORMALE"; // "NORMALE", "URGENTE"

    @Column(columnDefinition = "TEXT")
    private String etatEquipements;

    @Column(columnDefinition = "TEXT")
    private String defis;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Transient
    private String eleveNom;

    @Transient
    private String elevePrenom;

    @Transient
    private String centreNom;
}
