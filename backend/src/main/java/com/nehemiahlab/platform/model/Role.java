package com.nehemiahlab.platform.model;

public enum Role {
    DIRECTEUR,
    FORMATEUR,
    COORDINATEUR,
    /** Responsable d'un cluster : voit tous les centres du cluster assigné */
    RESPONSABLE_CLUSTER,
    COMPTABLE,
    /** Staff Nehemiah Lab */
    STAFF_NEHEMIAH,
    /** Animateur CDEJ */
    ANIMATEUR,
    /** Parent d'enfant accompagné */
    PARENT,
    /** Bénévole CDEJ */
    BENEVOLE,
    /** Participant CDEJ */
    PARTICIPANT
}
