package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "enfant_projects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnfantProject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enfant_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "projets"})
    private EnfantProfile enfant;

    @Column(nullable = false, length = 180)
    private String titre;

    @Column(length = 3000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectMediaType mediaType;

    private String mediaUrl;

    @Builder.Default
    private boolean actif = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
