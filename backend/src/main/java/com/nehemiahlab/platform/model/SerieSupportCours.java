package com.nehemiahlab.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Série de supports de cours (titre distinctif) — peut couvrir plusieurs modules SKA.
 */
@Entity
@Table(name = "series_supports_cours")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SerieSupportCours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private Integer ordre = 0;

    @Builder.Default
    private boolean actif = true;

    @OneToMany(mappedBy = "serie", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC, id ASC")
    @Builder.Default
    @JsonIgnore
    private List<SupportCoursFichier> fichiers = new ArrayList<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "serie_support_modules",
            joinColumns = @JoinColumn(name = "serie_support_id"),
            inverseJoinColumns = @JoinColumn(name = "module_cours_id")
    )
    @Builder.Default
    @JsonIgnore
    private Set<ModuleCours> modules = new HashSet<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @JsonProperty("fichiers")
    public List<SupportCoursFichier> getFichiersApi() {
        return fichiers != null ? fichiers : List.of();
    }

    @JsonProperty("moduleIds")
    public List<Long> getModuleIdsApi() {
        if (modules == null) return List.of();
        return modules.stream().map(ModuleCours::getId).sorted().collect(Collectors.toList());
    }

    @JsonProperty("modules")
    public List<ModuleCoursSummary> getModulesSummaryApi() {
        if (modules == null) return List.of();
        return modules.stream()
                .sorted((a, b) -> Integer.compare(
                        a.getNumeroOrdre() != null ? a.getNumeroOrdre() : 0,
                        b.getNumeroOrdre() != null ? b.getNumeroOrdre() : 0))
                .map(m -> new ModuleCoursSummary(
                        m.getId(),
                        m.getNumeroOrdre(),
                        m.getTitre(),
                        m.isActif()))
                .collect(Collectors.toList());
    }

    public void addFichier(SupportCoursFichier fichier) {
        if (fichiers == null) fichiers = new ArrayList<>();
        fichier.setSerie(this);
        if (fichier.getOrdre() == null) {
            fichier.setOrdre(fichiers.size());
        }
        fichiers.add(fichier);
    }

    public void removeFichier(SupportCoursFichier fichier) {
        if (fichiers == null) return;
        fichiers.remove(fichier);
        fichier.setSerie(null);
    }

    public record ModuleCoursSummary(Long id, Integer numeroOrdre, String titre, boolean actif) {}
}
