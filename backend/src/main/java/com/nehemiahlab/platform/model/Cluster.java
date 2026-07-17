package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "clusters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cluster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nom;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
