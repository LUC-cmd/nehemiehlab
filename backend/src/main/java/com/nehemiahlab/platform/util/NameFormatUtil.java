package com.nehemiahlab.platform.util;

import java.util.Locale;

/**
 * Formatage standard des noms de personnes pour tout l'affichage et tous les
 * exports (listes formateurs/coordinateurs/eleves/directeurs/utilisateurs) :
 * - le nom de famille est toujours affiche en MAJUSCULES, quelle que soit la
 *   casse saisie par la personne a l'inscription/creation du compte ;
 * - le(s) prenom(s) sont affiches avec une majuscule en debut de chaque mot
 *   (et de chaque partie d'un prenom compose avec un tiret), le reste en
 *   minuscules ;
 * - l'ordre d'affichage est toujours "NOM Prenom" (jamais l'inverse).
 */
public final class NameFormatUtil {
    private NameFormatUtil() {}

    private static final Locale FR = Locale.FRENCH;

    /** Nom de famille : toujours tout en majuscules. */
    public static String formatNom(String nom) {
        if (nom == null) return null;
        String trimmed = nom.trim().replaceAll("\\s+", " ");
        return trimmed.isEmpty() ? trimmed : trimmed.toUpperCase(FR);
    }

    /**
     * Prenom(s) : premiere lettre de chaque prenom en majuscule, le reste en
     * minuscule. Gere les prenoms multiples separes par un espace
     * (« Marie Claire ») et les prenoms composes avec un tiret
     * (« Jean-Paul »).
     */
    public static String formatPrenom(String prenom) {
        if (prenom == null) return null;
        String trimmed = prenom.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) return trimmed;
        StringBuilder out = new StringBuilder();
        for (String word : trimmed.split(" ")) {
            if (out.length() > 0) out.append(' ');
            out.append(capitalizeHyphenated(word));
        }
        return out.toString();
    }

    private static String capitalizeHyphenated(String word) {
        String[] parts = word.split("-");
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) out.append('-');
            out.append(capitalizeWord(parts[i]));
        }
        return out.toString();
    }

    private static String capitalizeWord(String word) {
        if (word.isEmpty()) return word;
        String lower = word.toLowerCase(FR);
        return lower.substring(0, 1).toUpperCase(FR) + lower.substring(1);
    }

    /**
     * "NOM Prenom" pret a afficher : nom de famille en majuscules d'abord,
     * puis le(s) prenom(s) en casse normale. A utiliser partout ou une
     * personne (formateur, coordinateur, eleve, directeur, utilisateur...)
     * est affichee ou imprimee/exportee.
     */
    public static String formatNomComplet(String nom, String prenom) {
        String n = formatNom(nom);
        String p = formatPrenom(prenom);
        boolean nEmpty = n == null || n.isEmpty();
        boolean pEmpty = p == null || p.isEmpty();
        if (nEmpty && pEmpty) return "-";
        if (nEmpty) return p;
        if (pEmpty) return n;
        return n + " " + p;
    }
}
