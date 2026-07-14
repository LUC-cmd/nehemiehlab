package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Banque disponible pour les comptes bancaires — gérée par le comptable. */
@Entity
@Table(name = "banques")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Banque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String nom;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
