package com.nehemiahlab.platform.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeanceDureeRepartitionTest {

    @Test
    void seancePlusCourteQueTroisHeuresResteTelleQuelle() {
        var plan = SeanceDureeRepartition.planifier(120);
        assertEquals(120, plan.minutesMatin());
        assertEquals(0, plan.minutesSoiree());
        assertEquals(0, plan.minutesReportees());
        assertFalse(plan.doubleCreneau());
    }

    @Test
    void surplusAuDelaDeTroisHeuresEstReporte() {
        var plan = SeanceDureeRepartition.planifier(254);
        assertEquals(180, plan.minutesMatin());
        assertEquals(0, plan.minutesSoiree());
        assertEquals(74, plan.minutesReportees());
        assertFalse(plan.doubleCreneau());
    }

    @Test
    void sixHeuresDonnentDeuxSeancesDeTroisHeures() {
        var plan = SeanceDureeRepartition.planifier(380);
        assertEquals(180, plan.minutesMatin());
        assertEquals(180, plan.minutesSoiree());
        assertEquals(20, plan.minutesReportees());
        assertTrue(plan.doubleCreneau());
    }

    @Test
    void auDelaDeSixHeuresLeResteEstReporte() {
        var plan = SeanceDureeRepartition.planifier(540);
        assertEquals(180, plan.minutesMatin());
        assertEquals(180, plan.minutesSoiree());
        assertEquals(180, plan.minutesReportees());
        assertTrue(plan.doubleCreneau());
    }

    @Test
    void seancesTerrainAnieDonnentVingtHuitBlocsDeTroisHeures() {
        int[] durees = {254, 306, 310, 352, 321, 376, 421, 401, 391, 348, 423, 400, 365, 376};
        List<SeanceDureeRepartition.SeanceSource> sources = new ArrayList<>();
        LocalDateTime debut = LocalDateTime.of(2026, 8, 12, 8, 27);
        for (int i = 0; i < durees.length; i++) {
            sources.add(new SeanceDureeRepartition.SeanceSource(debut.plusDays(i * 2L), durees[i], i));
        }
        var creneaux = SeanceDureeRepartition.planifierHistorique(sources);
        assertEquals(28, creneaux.size());
        assertTrue(creneaux.stream().allMatch(c ->
                java.time.Duration.between(c.heureDebut(), c.heureFin()).toMinutes() == 180));
        int total = 0;
        for (int d : durees) total += d;
        assertEquals(4, SeanceDureeRepartition.minutesRestantesHistorique(total));
    }
}
