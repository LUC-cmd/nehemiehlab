package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "formateur_evaluations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormateurEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long formateurId;

    @Column(nullable = false)
    private Long moduleCoursId;

    @Builder.Default
    @Column(nullable = false)
    private Integer quizScore = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer quizTotal = 0;

    @Column(columnDefinition = "TEXT")
    private String quizReponses;

    private String scratchUrl;

    private String scratchNom;

    @Column(columnDefinition = "TEXT")
    private String analyse;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Transient
    private String formateurNom;

    @Transient
    private String formateurPrenom;

    @Transient
    private String moduleTitre;
}
