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

    /**
     * Conversation "libre" (style WhatsApp) : liste explicite de participants choisis par
     * le createur (formateur, directeur ou comptable), au lieu d'une audience calculee par
     * centre/cluster/comptable. Quand ce set n'est pas vide, l'acces est strictement limite
     * a ces personnes (le Directeur n'a pas d'acces automatique).
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conversation_ciblee_participants", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id")
    @Builder.Default
    private java.util.Set<Long> participantIds = new java.util.HashSet<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
