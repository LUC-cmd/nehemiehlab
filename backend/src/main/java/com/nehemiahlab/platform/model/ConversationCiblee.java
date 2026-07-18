package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Conversation ciblee creee par le Directeur : au lieu des 4 canaux fixes
 * (voir CanalDiscussion), le Directeur choisit dynamiquement une audience
 * precise -- les formateurs d'UN centre, OU d'UN cluster, et/ou le comptable.
 * Cas particulier : centreId et cluster tous deux null + inclureComptable=true
 * => discussion directe Directeur <-> Comptable (sans les formateurs).
 * L'appartenance (qui peut voir/repondre) est recalculee a la volee a partir
 * de ces criteres (pas de table de membres a maintenir).
 */
@Entity
@Table(name = "conversations_ciblees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationCiblee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Centre cible (formateurs de ce centre uniquement). Null si non applicable. */
    private Long centreId;

    /** Nom du centre au moment de la creation (affichage, meme si le centre est renomme/supprime plus tard). */
    private String centreNom;

    /** Cluster cible (formateurs des centres de ce cluster). Null si non applicable. */
    private String cluster;

    /** Si vrai, le comptable fait partie de l'audience. */
    @Builder.Default
    private boolean inclureComptable = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
