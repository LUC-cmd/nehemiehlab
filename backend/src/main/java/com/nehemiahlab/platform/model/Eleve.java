package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "eleves")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Eleve {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    /** Matricule unique : AA + SKA + 4 chiffres (ex: 26SKA0487) */
    @Column(unique = true, length = 16)
    private String matricule;

    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false)
    private String sexe; // "M" or "F"

    @Column(nullable = false)
    private String classe;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "formateur_id")
    private User formateur;

    @Column(nullable = false)
    private LocalDate dateDebutFormation;

    private LocalDate dateFinFormation;

    @Builder.Default
    private Double totalHeures = 0.0;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "projet_id")
    private Projet projet;

    @Transient
    private Double performanceMoyenne;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
