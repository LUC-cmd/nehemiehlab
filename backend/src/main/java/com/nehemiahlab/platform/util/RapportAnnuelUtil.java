package com.nehemiahlab.platform.util;

/**
 * Utilitaires pour le rapport annuel formateur (niveau de maîtrise, libellés).
 */
public final class RapportAnnuelUtil {

    private RapportAnnuelUtil() {}

    public static final String SKA_FOOTER_LEFT = "Un Programme de";
    public static final String SKA_FOOTER_PHONE = "+228 97 25 53 53";
    public static final String SKA_FOOTER_WEB = "SKA.NEHEMIAHLAB.COM";

    public static String niveauFromNote(Double note) {
        if (note == null) return "—";
        double n = note > 10 ? note / 2.0 : note;
        if (n >= 8) return "Très-bien";
        if (n >= 6.5) return "Bien";
        if (n >= 5) return "Assez-bien";
        if (n >= 4) return "Passable";
        return "Médiocre";
    }

    public static String resolveNiveauMaitrise(String explicit, Double avgNote) {
        if (explicit != null && !explicit.isBlank()) return explicit;
        return niveauFromNote(avgNote);
    }

    public static String buildObservations(
            String observationsRapport,
            String pointsForts,
            String sessionComments
    ) {
        StringBuilder sb = new StringBuilder();
        if (observationsRapport != null && !observationsRapport.isBlank()) {
            sb.append(observationsRapport.trim());
        }
        if (pointsForts != null && !pointsForts.isBlank()) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(pointsForts.trim());
        }
        if (sessionComments != null && !sessionComments.isBlank()) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(sessionComments.trim());
        }
        return sb.isEmpty() ? "—" : sb.toString();
    }
}
