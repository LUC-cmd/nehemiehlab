package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ressources_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RessourceItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String titre;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceCategory categorie;

    private String lien;

    /**
     * Ancien champ mono-fichier — conservé pour compatibilité.
     * Préférer {@link #fichiers}.
     */
    private String fichierUrl;

    private String fichierNom;

    @OneToMany(mappedBy = "ressource", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC, id ASC")
    @Builder.Default
    @JsonIgnore
    private List<RessourceFichier> fichiers = new ArrayList<>();

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

    @JsonProperty("fichiers")
    public List<RessourceFichier> getFichiersApi() {
        if (fichiers != null && !fichiers.isEmpty()) {
            return fichiers;
        }
        if (fichierUrl != null && !fichierUrl.isBlank()) {
            return List.of(RessourceFichier.builder()
                    .url(fichierUrl)
                    .nom(fichierNom != null ? fichierNom : "document")
                    .ordre(0)
                    .build());
        }
        return fichiers != null ? fichiers : List.of();
    }

    public void addFichier(RessourceFichier fichier) {
        if (fichiers == null) fichiers = new ArrayList<>();
        fichier.setRessource(this);
        if (fichier.getOrdre() == null) {
            fichier.setOrdre(fichiers.size());
        }
        fichiers.add(fichier);
        if (fichiers.size() == 1) {
            fichierUrl = fichier.getUrl();
            fichierNom = fichier.getNom();
        }
    }

    public void removeFichier(RessourceFichier fichier) {
        if (fichiers == null) return;
        fichiers.remove(fichier);
        fichier.setRessource(null);
        if (fichiers.isEmpty()) {
            fichierUrl = null;
            fichierNom = null;
        } else {
            fichierUrl = fichiers.get(0).getUrl();
            fichierNom = fichiers.get(0).getNom();
        }
    }

    /** Migre l'ancien mono-fichier vers la collection avant écriture. */
    public void ensureFichiersHydrated() {
        if (fichiers == null) fichiers = new ArrayList<>();
        if (fichiers.isEmpty() && fichierUrl != null && !fichierUrl.isBlank()) {
            fichiers.add(RessourceFichier.builder()
                    .url(fichierUrl)
                    .nom(fichierNom != null ? fichierNom : "document")
                    .ordre(0)
                    .ressource(this)
                    .build());
        }
    }
}
