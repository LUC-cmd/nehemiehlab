package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pre_registrations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column(nullable = false, unique = true)
    private String email;

    private String telephone;

    @Builder.Default
    private boolean utilise = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
