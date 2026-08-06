package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Créneau récurrent de l'agenda hebdomadaire d'un formateur : un jour de la
 * semaine (1 = lundi ... 7 = dimanche), un centre et une plage horaire.
 * Sert uniquement à la planification/visualisation ; indépendant du
 * démarrage effectif d'une séance (SessionCours).
 */
@Entity
@Table(name = "formateur_agenda")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormateurAgendaEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formateur_id", nullable = false)
    private User formateur;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    @Column(name = "jour_semaine", nullable = false)
    private Short jourSemaine;

    @Column(name = "heure_debut", nullable = false)
    private LocalTime heureDebut;

    @Column(name = "heure_fin", nullable = false)
    private LocalTime heureFin;

    @Column
    private String notes;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Transient
    private String centreNom;
}
