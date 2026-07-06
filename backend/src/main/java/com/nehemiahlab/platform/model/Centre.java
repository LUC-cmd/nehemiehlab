package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "coordinateur_id")
    private User coordinateur;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "centre_formateurs",
        joinColumns = @JoinColumn(name = "centre_id"),
        inverseJoinColumns = @JoinColumn(name = "formateur_id")
    )
    private List<User> formateurs = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
