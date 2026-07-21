package com.nehemiahlab.platform.model;

/** Type de document depose par un formateur sur son espace dedie. */
public enum FormateurDocumentType {
    /** Contrat signe par le formateur, visible par le Directeur. */
    CONTRAT,
    /** Projet realise (fichier .sb3 Scratch), historique illimite. */
    PROJET,
    /** Presentation (PowerPoint/PDF) demandee par le Directeur. */
    PRESENTATION
}
