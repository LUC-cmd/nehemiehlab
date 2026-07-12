package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "evaluations_session")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "session_cours_id", nullable = false)
    private SessionCours sessionCours;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "eleve_id", nullable = false)
    @JsonIgnoreProperties({"centre", "formateur"})
    private Eleve eleve;

    /** Par défaut OFF (absent) — le formateur active la présence en séance */
    @Builder.Default
    private boolean present = false;

    /** Note de participation sur 10 (obligatoire si présent) */
    private Double note;

    /** Commentaire libre (optionnel) */
    @Column(columnDefinition = "TEXT")
    private String commentaire;

    /** Projet travaillé par l'enfant pendant cette séance (optionnel si pas de projet) */
    private String projetTravaille;

    /** true = projet de fin de formation (sort sur le rapport annuel), false = pratique */
    @Builder.Default
    private boolean projetFinal = false;

    @Column(columnDefinition = "TEXT")
    private String projetProbleme;

    @Column(columnDefinition = "TEXT")
    private String projetSolution;

    /** Heure d'arrivée réelle (quand le formateur passe sur ON — gère les retards) */
    private java.time.LocalDateTime heureArrivee;

    /** Heure de départ (fixée à la clôture de la séance si présent) */
    private java.time.LocalDateTime heureDepart;

    /** Minutes réellement effectuées par l'enfant dans cette séance */
    private Long dureeMinutes;
}
