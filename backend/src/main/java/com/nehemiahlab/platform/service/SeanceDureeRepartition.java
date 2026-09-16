package com.nehemiahlab.platform.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Une séance compte toujours 3 h, pendant la journée scolaire : 8 h → 17 h.
 * On ne crée jamais un jour où le formateur n'a pas enregistré de séance :
 * seules les dates déjà saisies sont utilisées. Deux centres le même jour
 * restent possibles. Le surplus d'un jour n'est pas posé sur un autre jour.
 */
public final class SeanceDureeRepartition {

    public static final int BLOC_MINUTES = 180;
    public static final int SEUIL_DOUBLE_MINUTES = 360;
    public static final int MAX_BLOCS_PAR_JOUR = 2;
    public static final LocalTime DEBUT_SCOLAIRE = LocalTime.of(8, 0);
    public static final LocalTime FIN_SCOLAIRE = LocalTime.of(17, 0);

    private SeanceDureeRepartition() {}

    public enum TypeCreneau { MATIN, SOIREE }

    public record SeanceSource(LocalDateTime heureDebut, int minutes, int sourceIndex) {}

    public record CreneauPlan(
            LocalDateTime heureDebut,
            LocalDateTime heureFin,
            TypeCreneau type,
            int sourceIndex
    ) {}

    public static int variationDebutMinutes(int seed) {
        return Math.floorMod(seed * 17 + 11, 19) - 9;
    }

    public static int pauseMemeCentreMinutes(int seed) {
        return 16 + Math.floorMod(seed * 5 + 2, 12);
    }

    public static int pauseEntreCentresMinutes(int seed) {
        return 20 + Math.floorMod(seed * 3, 8);
    }

    public static boolean horaireHorsJourneeScolaire(LocalDateTime debut, LocalDateTime fin) {
        if (debut == null) {
            return false;
        }
        LocalDateTime f = fin != null ? fin : debut.plusMinutes(BLOC_MINUTES);
        if (debut.toLocalTime().isBefore(DEBUT_SCOLAIRE)) {
            return true;
        }
        if (!f.toLocalDate().equals(debut.toLocalDate())) {
            return true;
        }
        return f.toLocalTime().isAfter(FIN_SCOLAIRE);
    }

    public static boolean tientDansJourneeScolaire(LocalDateTime debut) {
        if (debut == null) {
            return false;
        }
        LocalDateTime fin = debut.plusMinutes(BLOC_MINUTES);
        if (!fin.toLocalDate().equals(debut.toLocalDate())) {
            return false;
        }
        if (debut.toLocalTime().isBefore(DEBUT_SCOLAIRE)) {
            return false;
        }
        return !fin.toLocalTime().isAfter(FIN_SCOLAIRE);
    }

    public static LocalDateTime matinScolaire(LocalDate jour, int seed) {
        int extra = Math.floorMod(seed * 7 + 3, 25);
        return jour.atTime(DEBUT_SCOLAIRE).plusMinutes(extra);
    }

    /** Garde le jour enregistré : si 14 h ne permet pas 3 h avant 17 h, on commence vers 8 h ce jour-là. */
    public static LocalDateTime cadrerDebutScolaire(LocalDateTime brut, int seed) {
        LocalDate jour = brut != null ? brut.toLocalDate() : LocalDate.now();
        LocalDateTime d = brut != null
                ? brut.plusMinutes(variationDebutMinutes(seed))
                : matinScolaire(jour, seed);
        if (d.toLocalDate().equals(jour) && tientDansJourneeScolaire(d)) {
            return d;
        }
        return matinScolaire(jour, seed);
    }

    /**
     * Découpe en 3 h uniquement sur les dates déjà enregistrées.
     * Chaque jour ne reçoit que le temps de ce jour-là (max 2 séances).
     * On ne reporte jamais sur un jour où personne n'a enregistré de séance.
     */
    public static List<CreneauPlan> planifierHistorique(List<SeanceSource> sources) {
        List<CreneauPlan> out = new ArrayList<>();
        if (sources == null || sources.isEmpty()) {
            return out;
        }
        Map<LocalDate, List<SeanceSource>> parJour = new LinkedHashMap<>();
        for (SeanceSource source : sources) {
            LocalDateTime debut = source.heureDebut() != null
                    ? source.heureDebut()
                    : LocalDateTime.of(LocalDate.now(), DEBUT_SCOLAIRE);
            parJour.computeIfAbsent(debut.toLocalDate(), d -> new ArrayList<>()).add(source);
        }

        int seed = 0;
        for (Map.Entry<LocalDate, List<SeanceSource>> entree : parJour.entrySet()) {
            LocalDate jour = entree.getKey();
            int available = 0;
            for (SeanceSource source : entree.getValue()) {
                available += Math.max(0, source.minutes());
            }
            LocalDateTime curseur = matinScolaire(jour, jour.getDayOfYear() + seed);
            int places = 0;
            while (available >= BLOC_MINUTES && places < MAX_BLOCS_PAR_JOUR && tientDansJourneeScolaire(curseur)) {
                int sourceIndex = entree.getValue().get(Math.min(places, entree.getValue().size() - 1)).sourceIndex();
                TypeCreneau type = places == 0 ? TypeCreneau.MATIN : TypeCreneau.SOIREE;
                out.add(creneau(curseur, type, sourceIndex));
                available -= BLOC_MINUTES;
                places++;
                curseur = curseur.plusMinutes(BLOC_MINUTES + pauseMemeCentreMinutes(jour.getDayOfYear() + places));
            }
            seed++;
        }
        return out;
    }

    public static int minutesNonPlacees(int totalMinutes, int nbBlocs) {
        return Math.max(0, totalMinutes - nbBlocs * BLOC_MINUTES);
    }

    public static int minutesRestantesHistorique(int totalMinutes) {
        return Math.max(0, totalMinutes) % BLOC_MINUTES;
    }

    private static CreneauPlan creneau(LocalDateTime debut, TypeCreneau type, int sourceIndex) {
        return new CreneauPlan(debut, debut.plusMinutes(BLOC_MINUTES), type, sourceIndex);
    }

    public static String titreMatin(String titre) {
        return baseTitre(titre) + " — Séance matin";
    }

    public static String titreSoiree(String titre) {
        return baseTitre(titre) + " — Séance soirée";
    }

    static String baseTitre(String titre) {
        if (titre == null || titre.isBlank()) {
            return "Séance";
        }
        String trimmed = titre.trim();
        trimmed = trimmed.replaceAll("\\s+[—–-]\\s+Séance matin$", "");
        trimmed = trimmed.replaceAll("\\s+[—–-]\\s+Séance soirée$", "");
        return trimmed.isBlank() ? "Séance" : trimmed;
    }
}
