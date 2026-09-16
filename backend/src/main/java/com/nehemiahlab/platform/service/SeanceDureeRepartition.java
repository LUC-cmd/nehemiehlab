package com.nehemiahlab.platform.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Une séance compte toujours 3 h, pendant la journée scolaire : 8 h → 17 h.
 * 18 h est trop tard (les enfants sont à la maison) : le reste passe au lendemain.
 * Les minutes de début varient un peu, jamais toutes à 8h00 pile.
 */
public final class SeanceDureeRepartition {

    public static final int BLOC_MINUTES = 180;
    public static final int SEUIL_DOUBLE_MINUTES = 360;
    public static final LocalTime DEBUT_SCOLAIRE = LocalTime.of(8, 0);
    /** Fin souhaitée et maximale : jamais après 17 h. */
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

    /** Minutes ajoutées ou retirées au début réel (−9 à +9), déterministe. */
    public static int variationDebutMinutes(int seed) {
        return Math.floorMod(seed * 17 + 11, 19) - 9;
    }

    /** Pause dans le même centre : 16 à 27 min (toujours plus de 15). */
    public static int pauseMemeCentreMinutes(int seed) {
        return 16 + Math.floorMod(seed * 5 + 2, 12);
    }

    /** Trajet entre deux centres : 20 à 27 min (jamais moins de 20). */
    public static int pauseEntreCentresMinutes(int seed) {
        return 20 + Math.floorMod(seed * 3, 8);
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

    public static LocalDateTime cadrerDebutScolaire(LocalDateTime brut, int seed) {
        LocalDateTime d = brut != null
                ? brut.plusMinutes(variationDebutMinutes(seed))
                : matinScolaire(LocalDate.now(), seed);
        if (d.toLocalTime().isBefore(DEBUT_SCOLAIRE)) {
            d = matinScolaire(d.toLocalDate(), seed);
        }
        if (!tientDansJourneeScolaire(d)) {
            LocalDate jour = d.toLocalDate().plusDays(1);
            d = matinScolaire(jour, seed + 11);
        }
        return d;
    }

    public static List<CreneauPlan> planifierHistorique(List<SeanceSource> sources) {
        List<CreneauPlan> out = new ArrayList<>();
        if (sources == null || sources.isEmpty()) {
            return out;
        }
        int carry = 0;
        int seed = 0;
        LocalDateTime candidate = null;
        int dernierIndex = sources.get(0).sourceIndex();

        for (SeanceSource source : sources) {
            int available = Math.max(0, source.minutes()) + carry;
            dernierIndex = source.sourceIndex();
            candidate = cadrerDebutScolaire(source.heureDebut(), source.sourceIndex() + seed);
            if (!out.isEmpty()) {
                CreneauPlan last = out.get(out.size() - 1);
                int pause = pauseMemeCentreMinutes(source.sourceIndex() + seed);
                LocalDateTime minDebut = last.heureFin().plusMinutes(pause);
                if (candidate.isBefore(minDebut)) {
                    candidate = minDebut;
                }
            }
            int places = 0;
            while (available >= BLOC_MINUTES) {
                if (places >= 2 || !tientDansJourneeScolaire(candidate)) {
                    LocalDate lendemain = candidate.toLocalDate();
                    if (!candidate.toLocalTime().isBefore(DEBUT_SCOLAIRE)) {
                        lendemain = lendemain.plusDays(1);
                    }
                    candidate = matinScolaire(lendemain, seed++);
                    places = 0;
                    continue;
                }
                TypeCreneau type = places == 0 ? TypeCreneau.MATIN : TypeCreneau.SOIREE;
                out.add(creneau(candidate, type, source.sourceIndex()));
                available -= BLOC_MINUTES;
                places++;
                candidate = candidate.plusMinutes(BLOC_MINUTES + pauseMemeCentreMinutes(source.sourceIndex() + places));
            }
            carry = available;
        }

        while (carry >= BLOC_MINUTES) {
            if (candidate == null || !tientDansJourneeScolaire(candidate)) {
                LocalDate jour = candidate != null ? candidate.toLocalDate().plusDays(1) : LocalDate.now().plusDays(1);
                candidate = matinScolaire(jour, seed++);
            }
            int places = 0;
            while (carry >= BLOC_MINUTES && places < 2) {
                if (!tientDansJourneeScolaire(candidate)) {
                    candidate = matinScolaire(candidate.toLocalDate().plusDays(1), seed++);
                    places = 0;
                    continue;
                }
                TypeCreneau type = places == 0 ? TypeCreneau.MATIN : TypeCreneau.SOIREE;
                out.add(creneau(candidate, type, dernierIndex));
                carry -= BLOC_MINUTES;
                places++;
                candidate = candidate.plusMinutes(BLOC_MINUTES + pauseMemeCentreMinutes(dernierIndex + places));
            }
        }
        return out;
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
