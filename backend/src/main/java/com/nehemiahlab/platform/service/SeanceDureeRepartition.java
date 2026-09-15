package com.nehemiahlab.platform.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Une séance compte toujours 3 h. Les minutes de début et de fin varient
 * (plus ou moins) à partir de l'heure réelle déjà enregistrée — jamais toutes à 8h00 pile.
 * Au plus deux par jour dans le même centre, pause de plus de 15 min.
 * Au-delà de 6 h, le reste est reporté jusqu'à former d'autres blocs de 3 h.
 */
public final class SeanceDureeRepartition {

    public static final int BLOC_MINUTES = 180;
    public static final int SEUIL_DOUBLE_MINUTES = 360;

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

    public static List<CreneauPlan> planifierHistorique(List<SeanceSource> sources) {
        List<CreneauPlan> out = new ArrayList<>();
        if (sources == null || sources.isEmpty()) {
            return out;
        }
        int carry = 0;
        LocalDateTime dernierDebut = sources.get(0).heureDebut();
        int dernierIndex = sources.get(0).sourceIndex();

        for (SeanceSource source : sources) {
            int available = Math.max(0, source.minutes()) + carry;
            LocalDateTime brut = source.heureDebut() != null
                    ? source.heureDebut()
                    : LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 17));
            LocalDateTime debutMatin = brut.plusMinutes(variationDebutMinutes(source.sourceIndex() + brut.getDayOfYear()));
            dernierDebut = debutMatin;
            dernierIndex = source.sourceIndex();
            int places = 0;
            while (available >= BLOC_MINUTES && places < 2) {
                if (places == 0) {
                    out.add(creneau(debutMatin, TypeCreneau.MATIN, source.sourceIndex()));
                } else {
                    int pause = pauseMemeCentreMinutes(source.sourceIndex() + places);
                    LocalDateTime debutSoir = debutMatin.plusMinutes(BLOC_MINUTES + pause);
                    out.add(creneau(debutSoir, TypeCreneau.SOIREE, source.sourceIndex()));
                }
                available -= BLOC_MINUTES;
                places++;
            }
            carry = available;
        }

        LocalDate jour = dernierDebut.toLocalDate().plusDays(1);
        LocalTime heureMatin = dernierDebut.toLocalTime();
        int overflow = 0;
        while (carry >= BLOC_MINUTES) {
            int places = 0;
            LocalDateTime debutMatin = jour.atTime(heureMatin)
                    .plusMinutes(variationDebutMinutes(dernierIndex + jour.getDayOfYear() + overflow));
            while (carry >= BLOC_MINUTES && places < 2) {
                if (places == 0) {
                    out.add(creneau(debutMatin, TypeCreneau.MATIN, dernierIndex));
                } else {
                    int pause = pauseMemeCentreMinutes(dernierIndex + overflow + places);
                    out.add(creneau(debutMatin.plusMinutes(BLOC_MINUTES + pause), TypeCreneau.SOIREE, dernierIndex));
                }
                carry -= BLOC_MINUTES;
                places++;
            }
            jour = jour.plusDays(1);
            overflow++;
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
