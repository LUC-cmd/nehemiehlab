package com.nehemiahlab.platform.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeanceDureeRepartitionTest {

    @Test
    void chaqueSeanceFaitTroisHeures() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 8, 17), 360, 0)
        ));
        assertEquals(2, creneaux.size());
        for (SeanceDureeRepartition.CreneauPlan c : creneaux) {
            assertEquals(180, Duration.between(c.heureDebut(), c.heureFin()).toMinutes());
        }
    }

    @Test
    void debutEtFinNeSontPasToujoursHuitHeuresPile() {
        LocalDateTime origine = LocalDateTime.of(2026, 3, 2, 8, 17);
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(origine, 180, 0)
        ));
        assertEquals(1, creneaux.size());
        assertNotEquals(LocalDateTime.of(2026, 3, 2, 8, 0), creneaux.get(0).heureDebut());
        int pause = (int) Duration.between(origine, creneaux.get(0).heureDebut()).toMinutes();
        assertTrue(Math.abs(pause) <= 9);
    }

    @Test
    void deuxSeancesMemeCentreOntPlusDeQuinzeMinutesDePause() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 8, 4), 360, 1)
        ));
        assertEquals(2, creneaux.size());
        long pause = Duration.between(creneaux.get(0).heureFin(), creneaux.get(1).heureDebut()).toMinutes();
        assertTrue(pause > 15);
    }

    @Test
    void deuxJoursDifferentsNOntPasLesMemesMinutesDeDebut() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 8, 10), 180, 0),
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 3, 8, 10), 180, 1)
        ));
        assertEquals(2, creneaux.size());
        assertNotEquals(creneaux.get(0).heureDebut().toLocalTime(), creneaux.get(1).heureDebut().toLocalTime());
    }

    @Test
    void resteInferieurATroisHeuresNEstPasUneSeance() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 8, 22), 188, 0)
        ));
        assertEquals(1, creneaux.size());
        assertEquals(8, SeanceDureeRepartition.minutesRestantesHistorique(188));
    }

    @Test
    void aucuneSeanceNeDepasseDixSeptHeures() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 14, 30), 360, 0),
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 3, 8, 40), 360, 1)
        ));
        assertEquals(4, creneaux.size());
        for (SeanceDureeRepartition.CreneauPlan c : creneaux) {
            assertTrue(SeanceDureeRepartition.tientDansJourneeScolaire(c.heureDebut()));
            assertTrue(!c.heureFin().toLocalTime().isAfter(SeanceDureeRepartition.FIN_SCOLAIRE));
            assertTrue(!c.heureDebut().toLocalTime().isBefore(SeanceDureeRepartition.DEBUT_SCOLAIRE));
        }
    }
}
