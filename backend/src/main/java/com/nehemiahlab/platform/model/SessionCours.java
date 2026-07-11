package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sessions_cours")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionCours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "formateur_id", nullable = false)
    private User formateur;

    @Column(nullable = false)
    private LocalDateTime heureDebut;

    /** Heure de fin réelle (renseignée à la clôture) */
    private LocalDateTime heureFin;
    
    @Column(nullable = false)
    private Integer dureePrevueMinutes;

    @Column(nullable = false)
    private String statut; // "EN_COURS", "CLOTUREE"

    /** Module / activité réalisée pendant la séance */
    private String moduleFait;

    private Double latitudeDebut;

    private Double longitudeDebut;

    private Double precisionDebutMetres;

    private Double latitudeFin;

    private Double longitudeFin;

    private Double precisionFinMetres;
    
    private Long dureeReelleMinutes;
    
    private String rapportUrl;

    @Column(columnDefinition = "TEXT")
    private String etatEquipements;

    @Column(columnDefinition = "TEXT")
    private String defisSession;

    @Transient
    private Long nbPresents;

    @Transient
    private Long nbTotalEleves;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
