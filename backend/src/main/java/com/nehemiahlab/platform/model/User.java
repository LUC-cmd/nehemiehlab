package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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
    
    private String avatar;

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
