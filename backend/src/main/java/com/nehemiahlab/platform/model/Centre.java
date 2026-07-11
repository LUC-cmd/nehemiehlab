package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "centres")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Centre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String adresse;

    @Column(nullable = false)
    private String ville;

    @Column
    private String region;

    @Column
    private String cluster;

    private Double latitude;

    private Double longitude;

    /** Numéro du responsable / contact principal du centre */
    private String telephoneResponsable;

    /** Infos coordinateur du centre (sans créer de compte utilisateur) */
    private String coordinateurNom;

    private String coordinateurPrenom;

    /** Numéro du coordinateur (affiché aux formateurs) */
    private String telephoneCoordinateur;

    /** Numéro du formateur du centre (affiché aux coordinateurs) */
    private String telephoneFormateur;

    /** Compte coordinateur optionnel (assigné plus tard par le Directeur) */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "coordinateur_id")
    private User coordinateur;

    @Builder.Default
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "centre_formateurs",
        joinColumns = @JoinColumn(name = "centre_id"),
        inverseJoinColumns = @JoinColumn(name = "formateur_id")
    )
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("centres")
    private Set<User> formateurs = new HashSet<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
