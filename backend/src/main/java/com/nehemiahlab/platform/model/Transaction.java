package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "formateur_id", nullable = false)
    private User formateur;

    @Column(nullable = false)
    private Double montant;

    @Column(nullable = false)
    private String type; // "DEPLACEMENT", "HONORAIRES", "FRAIS_PEDAGOGIQUES", "MATERIEL", "AUTRE"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String statut = "EN_ATTENTE"; // "EN_ATTENTE", "VALIDEE", "REFUSEE"

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime validatedAt;
}
