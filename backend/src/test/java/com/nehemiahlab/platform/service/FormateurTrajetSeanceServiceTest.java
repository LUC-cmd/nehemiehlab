package com.nehemiahlab.platform.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static com.nehemiahlab.platform.service.FormateurTrajetSeanceService.CentreMinutes;
import static com.nehemiahlab.platform.service.FormateurTrajetSeanceService.Creneau;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FormateurTrajetSeanceServiceTest {

    private final LocalDateTime neuf = LocalDateTime.of(2026, 9, 15, 9, 0);
    private final LocalDateTime midi = LocalDateTime.of(2026, 9, 15, 12, 0);
    private final LocalDateTime base = LocalDateTime.of(2026, 9, 15, 8, 17);

    @Test
    void memesHeuresDeuxCentresEstImpossible() {
        assertNotNull(FormateurTrajetSeanceService.messageConflit(neuf, midi, neuf, midi, false, "Centre B"));
    }

    @Test
    void moinsDeVingtMinutesEntreDeuxCentresEstImpossible() {
        LocalDateTime debutB = midi.plusMinutes(10);
        assertNotNull(FormateurTrajetSeanceService.messageConflit(neuf, midi, debutB, debutB.plusHours(3), false, "Centre B"));
    }

    @Test
    void vingtMinutesEntreCentresSontAutorisees() {
        LocalDateTime debutB = midi.plusMinutes(20);
        assertNull(FormateurTrajetSeanceService.messageConflit(neuf, midi, debutB, debutB.plusHours(3), false, "Centre B"));
    }

    @Test
    void quinzeMinutesDansLeMemeCentreEstImpossible() {
        LocalDateTime debut2 = midi.plusMinutes(15);
        assertNotNull(FormateurTrajetSeanceService.messageConflit(neuf, midi, debut2, debut2.plusHours(3), true, "Même centre"));
    }

    @Test
    void seizeMinutesDansLeMemeCentreSontAutorisees() {
        LocalDateTime debut2 = midi.plusMinutes(16);
        assertNull(FormateurTrajetSeanceService.messageConflit(neuf, midi, debut2, debut2.plusHours(3), true, "Même centre"));
    }

    @Test
    void unCentreSixHeuresDonneDeuxSeancesAvecPausePlusDeQuinze() {
        List<Creneau> blocs = FormateurTrajetSeanceService.decouperPourCentres(
                base,
                List.of(new CentreMinutes(1L, 360)));
        assertEquals(2, blocs.size());
        assertEquals(180, Duration.between(blocs.get(0).debut(), blocs.get(0).fin()).toMinutes());
        assertEquals(180, Duration.between(blocs.get(1).debut(), blocs.get(1).fin()).toMinutes());
        assertTrue(Duration.between(blocs.get(0).fin(), blocs.get(1).debut()).toMinutes() > 15);
        assertEquals(1L, blocs.get(0).centreId());
        assertEquals(1L, blocs.get(1).centreId());
    }

    @Test
    void deuxCentresTroisHeuresChacunAvecVingtMinutesDeTrajet() {
        List<Creneau> blocs = FormateurTrajetSeanceService.decouperPourCentres(
                base,
                List.of(new CentreMinutes(1L, 180), new CentreMinutes(2L, 180)));
        assertEquals(2, blocs.size());
        assertEquals(1L, blocs.get(0).centreId());
        assertEquals(2L, blocs.get(1).centreId());
        assertTrue(Duration.between(blocs.get(0).fin(), blocs.get(1).debut()).toMinutes() >= 20);
    }

    @Test
    void quatreCentresNeSeChevauchentPas() {
        List<Creneau> blocs = FormateurTrajetSeanceService.decouperPourCentres(
                base,
                List.of(
                        new CentreMinutes(1L, 180),
                        new CentreMinutes(2L, 180),
                        new CentreMinutes(3L, 180),
                        new CentreMinutes(4L, 180)));
        assertEquals(4, blocs.size());
        for (int i = 0; i < blocs.size(); i++) {
            for (int j = i + 1; j < blocs.size(); j++) {
                assertTrue(blocs.get(i).fin().isBefore(blocs.get(j).debut())
                        || blocs.get(i).fin().equals(blocs.get(j).debut())
                        || blocs.get(j).fin().isBefore(blocs.get(i).debut()));
                assertTrue(!FormateurTrajetSeanceService.chevauche(
                        blocs.get(i).debut(), blocs.get(i).fin(),
                        blocs.get(j).debut(), blocs.get(j).fin()));
            }
        }
        assertTrue(blocs.get(2).debut().toLocalDate().isAfter(blocs.get(0).debut().toLocalDate())
                || blocs.get(3).debut().toLocalDate().isAfter(blocs.get(0).debut().toLocalDate()));
    }

    @Test
    void resteInferieurATroisHeuresNEstPasUneSeance() {
        List<Creneau> blocs = FormateurTrajetSeanceService.decouperPourCentres(
                base,
                List.of(new CentreMinutes(1L, 188)));
        assertEquals(1, blocs.size());
        assertEquals(180, Duration.between(blocs.get(0).debut(), blocs.get(0).fin()).toMinutes());
    }
}
