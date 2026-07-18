package com.nehemiahlab.platform.model;

/**
 * Canaux fixes des groupes de discussion internes. L'appartenance a chaque
 * canal est deduite automatiquement du role de l'utilisateur (pas de gestion
 * manuelle des membres) :
 *  - FORMATEURS             : les formateurs entre eux
 *  - FORMATEURS_DIRECTEUR   : formateurs + directeur
 *  - DIRECTION              : directeur + formateurs + comptable
 *  - COMPTABLE_FORMATEURS   : comptable + formateurs
 */
public enum CanalDiscussion {
    FORMATEURS,
    FORMATEURS_DIRECTEUR,
    DIRECTION,
    COMPTABLE_FORMATEURS;

    public String label() {
        return switch (this) {
            case FORMATEURS -> "Formateurs";
            case FORMATEURS_DIRECTEUR -> "Formateurs & Directeur";
            case DIRECTION -> "Direction (Directeur, Formateurs, Comptable)";
            case COMPTABLE_FORMATEURS -> "Comptable & Formateurs";
        };
    }

    /** Vrai si le role donne appartient a ce canal. */
    public boolean accessiblePar(Role role) {
        if (role == null) return false;
        return switch (this) {
            case FORMATEURS -> role == Role.FORMATEUR;
            case FORMATEURS_DIRECTEUR -> role == Role.FORMATEUR || role == Role.DIRECTEUR;
            case DIRECTION -> role == Role.DIRECTEUR || role == Role.FORMATEUR || role == Role.COMPTABLE;
            case COMPTABLE_FORMATEURS -> role == Role.COMPTABLE || role == Role.FORMATEUR;
        };
    }

    /** Roles concernes par ce canal (pour notifier les destinataires d'un nouveau message). */
    public java.util.List<Role> roles() {
        return switch (this) {
            case FORMATEURS -> java.util.List.of(Role.FORMATEUR);
            case FORMATEURS_DIRECTEUR -> java.util.List.of(Role.FORMATEUR, Role.DIRECTEUR);
            case DIRECTION -> java.util.List.of(Role.DIRECTEUR, Role.FORMATEUR, Role.COMPTABLE);
            case COMPTABLE_FORMATEURS -> java.util.List.of(Role.COMPTABLE, Role.FORMATEUR);
        };
    }
}
