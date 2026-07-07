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
    
    @Column(nullable = false)
    private Integer dureePrevueMinutes;

    @Column(nullable = false)
    private String statut; // "EN_COURS", "CLOTUREE"
    
    private Long dureeReelleMinutes;
    
    private String rapportUrl;

    @Transient
    private Long nbPresents;

    @Transient
    private Long nbTotalEleves;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
