package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Fichier depose par un formateur sur son espace dedie (contrat, projet
 * realise en .sb3, presentation demandee par le Directeur). Le formateur
 * peut en deposer autant qu'il veut ; le Directeur peut consulter ceux de
 * n'importe quel formateur depuis son profil.
 */
@Entity
@Table(name = "formateur_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormateurDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formateur_id", nullable = false)
    @JsonIgnore
    private User formateur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private FormateurDocumentType type;

    /** Titre libre (ex: nom du projet). Optionnel pour un contrat. */
    @Column(length = 180)
    private String titre;

    @Column(nullable = false)
    private String url;

    /** Nom du fichier original, pour affichage/telechargement. */
    private String nomFichierOriginal;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
