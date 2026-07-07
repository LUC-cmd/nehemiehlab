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
    @JsonIgnoreProperties({"centre", "formateur", "projet"})
    private Eleve eleve;

    @Builder.Default
    private boolean present = true;

    private Double note; // Note sur 20 (peut être null si pas de note)
}
