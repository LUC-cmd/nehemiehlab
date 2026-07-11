package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @Column(nullable = false, length = 180)
    private String nomComplet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommunityProfileType type;

    @Column(length = 120)
    private String roleAffiche;

    @Column(length = 2000)
    private String bio;

    private String photoUrl;

    @Builder.Default
    private Integer enfantsAccompagnes = 0;

    @Column(length = 500)
    private String competences;

    @Column(length = 500)
    private String contacts;

    @Builder.Default
    private boolean actif = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
