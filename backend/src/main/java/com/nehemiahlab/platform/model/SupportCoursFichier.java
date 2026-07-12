package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "supports_cours")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCoursFichier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false, length = 255)
    private String nom;

    @Column(length = 120)
    private String mimeType;

    @Builder.Default
    private Integer ordre = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serie_support_id", nullable = false)
    @JsonIgnore
    private SerieSupportCours serie;
}
