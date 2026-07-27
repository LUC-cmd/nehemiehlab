package com.nehemiahlab.platform.model;

/**
 * Libelles francais des roles, utilises notamment dans les emails envoyes
 * aux comptes crees par le Directeur (miroir de ROLE_LABELS cote frontend).
 */
public final class RoleLabels {

    private RoleLabels() {
    }

    public static String fr(Role role) {
        if (role == null) return "Utilisateur";
        return switch (role) {
            case DIRECTEUR -> "Directeur";
            case FORMATEUR -> "Formateur";
            case COORDINATEUR -> "Coordinateur";
            case RESPONSABLE_CLUSTER -> "Responsable cluster";
            case COMPTABLE -> "Comptable";
            case STAFF_NEHEMIAH -> "Staff Nehemiah";
            case ANIMATEUR -> "Animateur CDEJ";
            case PARENT -> "Parent";
            case BENEVOLE -> "Bénévole CDEJ";
            case PARTICIPANT -> "Participant CDEJ";
        };
    }
}
