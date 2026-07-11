package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String motDePasse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String telephone;

    /** Numéro de téléphone supplémentaire (saisi au profil) */
    private String telephoneSecondaire;

    /** IBAN / numéro de compte bancaire (pour paiements) */
    private String numeroCompteBancaire;

    /** Numéro Mobile Money / Flooz / TMoney si pas de carte bancaire */
    private String numeroMobileMoney;

    private String avatar;

    /** Photo recto de la carte d'identité (URL /uploads/identite/...) */
    private String carteIdentiteRecto;

    /** Photo verso de la carte d'identité (URL /uploads/identite/...) */
    private String carteIdentiteVerso;

    private LocalDate dateNaissance;

    private String lieuNaissance;

    private String adresse;

    /** Pour un compte PARENT : élève lié (connexion par matricule) */
    private Long eleveId;

    /** Pour RESPONSABLE_CLUSTER : nom du cluster assigné (doit correspondre à Centre.cluster) */
    private String assignedCluster;

    /** Les anciens comptes parent basés sur le matricule restent bloqués jusqu'à activation. */
    @Builder.Default
    @Column(nullable = false)
    private boolean parentCredentialsActivated = false;

    @Builder.Default
    @Column(nullable = false)
    private int failedLoginAttempts = 0;

    private LocalDateTime lockedUntil;

    /** Cumul d'heures de séances clôturées (formateur) */
    @Builder.Default
    private Double totalHeuresSeances = 0.0;

    @Builder.Default
    private boolean actif = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToMany(mappedBy = "formateurs", fetch = FetchType.EAGER)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("formateurs")
    @Builder.Default
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private java.util.Set<Centre> centres = new java.util.HashSet<>();
}
