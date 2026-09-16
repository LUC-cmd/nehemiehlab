package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.SessionCours;
import com.nehemiahlab.platform.repository.SessionCoursRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Un formateur n'est jamais à deux endroits au même moment.
 * <ul>
 *   <li>Centres différents : 20 minutes minimum entre la fin et le prochain début.</li>
 *   <li>Même centre : deux séances le même jour possibles, mais pas en même temps —
 *       plus de 15 minutes de pause avant de démarrer l'autre.</li>
 *   <li>Chaque séance découpée dure 3 h (180 min). Le reste &lt; 3 h n'est pas une séance :
 *       il est reporté jusqu'à former un nouveau bloc de 3 h.</li>
 * </ul>
 * Si le formateur a 1, 2, 3, 4 centres ou plus, les blocs sont enchaînés
 * sur la journée (puis le lendemain) en respectant ces écarts.
 */
@Service
public class FormateurTrajetSeanceService {

    public static final int DEPLACEMENT_CENTRES_MINUTES = 20;
    /** Pause strictement supérieure à 15 minutes → 16 minutes minimum. */
    public static final int PAUSE_MEME_CENTRE_MINUTES = 16;
    public static final int BLOC_CIBLE_MINUTES = 180;
    public static final int MAX_SEANCES_PAR_CENTRE_PAR_JOUR = 2;
    public static final LocalTime DEBUT_JOURNEE = LocalTime.of(8, 0);
    public static final LocalTime FIN_JOURNEE = LocalTime.of(17, 0);

    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH:mm");

    private final SessionCoursRepository sessionCoursRepository;

    public FormateurTrajetSeanceService(SessionCoursRepository sessionCoursRepository) {
        this.sessionCoursRepository = sessionCoursRepository;
    }

    public Optional<String> conflitHoraire(
            Long formateurId,
            Long centreId,
            LocalDateTime debut,
            LocalDateTime fin,
            Long sessionIdExclue
    ) {
        if (formateurId == null || centreId == null || debut == null) {
            return Optional.empty();
        }
        LocalDateTime finEffective = fin != null && !fin.isBefore(debut) ? fin : debut.plusMinutes(1);
        List<SessionCours> autres = sessionCoursRepository.findByFormateurIdOrderByHeureDebutDesc(formateurId);
        for (SessionCours autre : autres) {
            if (autre.getId() != null && autre.getId().equals(sessionIdExclue)) {
                continue;
            }
            if (autre.getCentre() == null || autre.getCentre().getId() == null) {
                continue;
            }
            LocalDateTime autreDebut = autre.getHeureDebut();
            if (autreDebut == null) {
                continue;
            }
            boolean memeCentre = autre.getCentre().getId().equals(centreId);
            LocalDateTime autreFin = finEffective(autre);
            String conflit = messageConflit(debut, finEffective, autreDebut, autreFin, memeCentre, nomCentre(autre));
            if (conflit != null) {
                return Optional.of(conflit);
            }
        }
        return Optional.empty();
    }

    static String messageConflit(
            LocalDateTime debut,
            LocalDateTime fin,
            LocalDateTime autreDebut,
            LocalDateTime autreFin,
            boolean memeCentre,
            String autreCentre
    ) {
        if (chevauche(debut, fin, autreDebut, autreFin)) {
            if (memeCentre) {
                return "Impossible : une autre séance dans ce centre chevauche "
                        + autreDebut.format(HEURE) + "–" + autreFin.format(HEURE)
                        + ". Deux séances le même jour sont possibles, mais pas au même moment : "
                        + "plus de 15 minutes de pause avant de démarrer l'autre.";
            }
            return "Impossible : vous avez déjà une séance à " + autreCentre
                    + " de " + autreDebut.format(HEURE) + " à " + autreFin.format(HEURE)
                    + ". Un formateur ne peut pas être dans deux centres au même moment.";
        }
        long ecart = ecartMinutes(debut, fin, autreDebut, autreFin);
        if (memeCentre) {
            if (ecart >= 0 && ecart <= 15) {
                return "Impossible : dans le même centre, il faut plus de 15 minutes de pause "
                        + "avant de démarrer l'autre séance. Écart actuel : " + ecart + " min.";
            }
            return null;
        }
        if (ecart >= 0 && ecart < DEPLACEMENT_CENTRES_MINUTES) {
            return "Impossible : il faut au moins " + DEPLACEMENT_CENTRES_MINUTES
                    + " minutes entre deux centres (fin à " + autreCentre
                    + " puis démarrage ailleurs). Écart actuel : " + ecart + " min.";
        }
        return null;
    }

    static boolean chevauche(LocalDateTime aDebut, LocalDateTime aFin, LocalDateTime bDebut, LocalDateTime bFin) {
        return aDebut.isBefore(bFin) && bDebut.isBefore(aFin);
    }

    static long ecartMinutes(LocalDateTime aDebut, LocalDateTime aFin, LocalDateTime bDebut, LocalDateTime bFin) {
        if (chevauche(aDebut, aFin, bDebut, bFin)) {
            return -1;
        }
        if (!aFin.isAfter(bDebut)) {
            return Duration.between(aFin, bDebut).toMinutes();
        }
        return Duration.between(bFin, aDebut).toMinutes();
    }

    static int pauseApres(Long centreActuel, Long prochainCentre, int seed) {
        if (centreActuel != null && centreActuel.equals(prochainCentre)) {
            return SeanceDureeRepartition.pauseMemeCentreMinutes(seed);
        }
        return SeanceDureeRepartition.pauseEntreCentresMinutes(seed);
    }

    /**
     * Découpe le temps de chaque centre en séances de 3 h (max 2 / centre / jour)
     * à partir de l'heure réelle fournie (minutes variables), pause &gt; 15 min
     * dans le même centre, 20 min min entre centres.
     */
    public static List<Creneau> decouperPourCentres(LocalDateTime premierDebut, List<CentreMinutes> charges) {
        List<Creneau> resultats = new ArrayList<>();
        if (charges == null || charges.isEmpty() || premierDebut == null) {
            return resultats;
        }
        LocalDate jour = premierDebut.toLocalDate();
        LocalTime heureBase = premierDebut.toLocalTime();
        if (heureBase.isBefore(DEBUT_JOURNEE) || heureBase.plusMinutes(BLOC_CIBLE_MINUTES).isAfter(FIN_JOURNEE)) {
            heureBase = LocalTime.of(8, 12);
        }
        int seed = 0;
        LocalDateTime curseur = premierDebut.plusMinutes(SeanceDureeRepartition.variationDebutMinutes(seed++));
        Long dernierCentre = null;
        Map<Long, Integer> seancesDuJour = new HashMap<>();

        for (CentreMinutes charge : charges) {
            if (charge == null || charge.centreId() == null) {
                continue;
            }
            int restant = Math.max(0, charge.minutes());
            while (restant >= BLOC_CIBLE_MINUTES) {
                int deja = seancesDuJour.getOrDefault(charge.centreId(), 0);
                if (deja >= MAX_SEANCES_PAR_CENTRE_PAR_JOUR) {
                    jour = jour.plusDays(1);
                    curseur = jour.atTime(heureBase).plusMinutes(SeanceDureeRepartition.variationDebutMinutes(seed++));
                    dernierCentre = null;
                    seancesDuJour.clear();
                    continue;
                }
                if (dernierCentre != null) {
                    curseur = curseur.plusMinutes(pauseApres(dernierCentre, charge.centreId(), seed++));
                }
                if (curseur.toLocalTime().isAfter(FIN_JOURNEE)
                        || curseur.plusMinutes(BLOC_CIBLE_MINUTES).toLocalTime().isAfter(FIN_JOURNEE)
                        || curseur.toLocalDate().isAfter(jour)) {
                    jour = curseur.toLocalDate().isAfter(jour) ? curseur.toLocalDate() : jour.plusDays(1);
                    curseur = jour.atTime(heureBase).plusMinutes(SeanceDureeRepartition.variationDebutMinutes(seed++));
                    dernierCentre = null;
                    seancesDuJour.clear();
                    continue;
                }
                LocalDateTime fin = curseur.plusMinutes(BLOC_CIBLE_MINUTES);
                resultats.add(new Creneau(charge.centreId(), curseur, fin));
                seancesDuJour.merge(charge.centreId(), 1, Integer::sum);
                dernierCentre = charge.centreId();
                curseur = fin;
                restant -= BLOC_CIBLE_MINUTES;
            }
        }
        return resultats;
    }

    static LocalDateTime finEffective(SessionCours session) {
        if (session.getHeureFin() != null) {
            return session.getHeureFin();
        }
        LocalDateTime debut = session.getHeureDebut();
        if (debut == null) {
            return LocalDateTime.now();
        }
        if (session.getDureeReelleMinutes() != null && session.getDureeReelleMinutes() > 0) {
            return debut.plusMinutes(session.getDureeReelleMinutes());
        }
        if (session.getDureePrevueMinutes() != null && session.getDureePrevueMinutes() > 0) {
            return debut.plusMinutes(session.getDureePrevueMinutes());
        }
        return debut.plusMinutes(1);
    }

    private static String nomCentre(SessionCours session) {
        if (session.getCentre() != null && session.getCentre().getNom() != null && !session.getCentre().getNom().isBlank()) {
            return session.getCentre().getNom();
        }
        return "un autre centre";
    }

    public record CentreMinutes(Long centreId, int minutes) {}

    public record Creneau(Long centreId, LocalDateTime debut, LocalDateTime fin) {}
}
