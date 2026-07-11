package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "formations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModuleFormation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private Long centreId;

    @Column(nullable = false)
    private Long formateurId;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double dureeHeures;

    @ElementCollection
    @CollectionTable(name = "formation_eleves_presents", joinColumns = @JoinColumn(name = "formation_id"))
    @Column(name = "eleve_id")
    @Builder.Default
    private List<Long> elevesPresents = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Enrichi à la lecture (non persisté) */
    @Transient
    private String formateurNom;

    @Transient
    private String formateurPrenom;
}
