package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "presences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Presence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eleveId;

    @Column(nullable = false)
    private LocalDate date;

    private LocalDateTime heureDebut;

    private LocalDateTime heureFin;

    private Long dureeMinutes;

    @Builder.Default
    private boolean sessionActive = true;
}
