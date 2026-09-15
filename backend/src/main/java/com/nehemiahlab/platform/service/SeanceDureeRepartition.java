package com.nehemiahlab.platform.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Une séance compte 3 h. Au plus deux par jour (matin ~8h–11h, pause 30 min, soirée).
 * Au-delà de 6 h, le reste est reporté jusqu’à épuisement en blocs de 3 h.
 */
public final class SeanceDureeRepartition {

    public static final int BLOC_MINUTES = 180;
    public static final int SEUIL_DOUBLE_MINUTES = 360;
    public static final int PAUSE_MINUTES = 30;

    private SeanceDureeRepartition() {}

    public enum TypeCreneau { MATIN, SOIREE }

    public record Plan(
            int minutesMatin,
            int minutesSoiree,
            int minutesReportees,
            boolean doubleCreneau
    ) {}

    public record SeanceSource(LocalDateTime heureDebut, int minutes, int sourceIndex) {}

    public record CreneauPlan(
            LocalDateTime heureDebut,
            LocalDateTime heureFin,
            TypeCreneau type,
            int sourceIndex
    ) {}

    /** Clôture : au plus 3 h le matin et 3 h le soir ; le reste (y compris au-delà de 6 h) est reporté. */
    public static Plan planifier(int minutesDisponibles) {
        int total = Math.max(0, minutesDisponibles);
        int blocs = total / BLOC_MINUTES;
        int reste = total % BLOC_MINUTES;
        if (blocs == 0) {
            return new Plan(total, 0, 0, false);
        }
        int minutesSoiree = blocs >= 2 ? BLOC_MINUTES : 0;
        int reportes = reste + Math.max(0, blocs - 2) * BLOC_MINUTES;
        return new Plan(BLOC_MINUTES, minutesSoiree, reportes, minutesSoiree > 0);
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
            LocalDateTime debutMatin = source.heureDebut() != null
                    ? source.heureDebut()
                    : LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 0));
            dernierDebut = debutMatin;
            dernierIndex = source.sourceIndex();
            int places = 0;
            while (available >= BLOC_MINUTES && places < 2) {
                if (places == 0) {
                    out.add(creneau(debutMatin, TypeCreneau.MATIN, source.sourceIndex()));
                } else {
                    LocalDateTime debutSoir = debutMatin.plusMinutes(BLOC_MINUTES + PAUSE_MINUTES);
                    out.add(creneau(debutSoir, TypeCreneau.SOIREE, source.sourceIndex()));
                }
                available -= BLOC_MINUTES;
                places++;
            }
            carry = available;
        }

        LocalDate jour = dernierDebut.toLocalDate().plusDays(1);
        LocalTime heureMatin = dernierDebut.toLocalTime();
        while (carry >= BLOC_MINUTES) {
            int places = 0;
            LocalDateTime debutMatin = jour.atTime(heureMatin);
            while (carry >= BLOC_MINUTES && places < 2) {
                if (places == 0) {
                    out.add(creneau(debutMatin, TypeCreneau.MATIN, dernierIndex));
                } else {
                    out.add(creneau(debutMatin.plusMinutes(BLOC_MINUTES + PAUSE_MINUTES), TypeCreneau.SOIREE, dernierIndex));
                }
                carry -= BLOC_MINUTES;
                places++;
            }
            jour = jour.plusDays(1);
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
