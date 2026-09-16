package com.nehemiahlab.platform.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
        assertEquals(origine.toLocalDate(), creneaux.get(0).heureDebut().toLocalDate());
        assertTrue(!creneaux.get(0).heureDebut().toLocalTime().isBefore(SeanceDureeRepartition.DEBUT_SCOLAIRE));
        assertNotEquals(LocalDateTime.of(2026, 3, 2, 8, 0), creneaux.get(0).heureDebut());
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
        assertEquals(java.time.LocalDate.of(2026, 3, 2), creneaux.get(0).heureDebut().toLocalDate());
        assertEquals(java.time.LocalDate.of(2026, 3, 2), creneaux.get(1).heureDebut().toLocalDate());
        assertEquals(java.time.LocalDate.of(2026, 3, 3), creneaux.get(2).heureDebut().toLocalDate());
        assertEquals(java.time.LocalDate.of(2026, 3, 3), creneaux.get(3).heureDebut().toLocalDate());
    }

    @Test
    void onNeCreePasUnJourSansSeanceEnregistree() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 8, 10), 540, 0)
        ));
        assertEquals(2, creneaux.size());
        assertEquals(java.time.LocalDate.of(2026, 3, 2), creneaux.get(0).heureDebut().toLocalDate());
        assertEquals(java.time.LocalDate.of(2026, 3, 2), creneaux.get(1).heureDebut().toLocalDate());
        assertEquals(180, SeanceDureeRepartition.minutesNonPlacees(540, creneaux.size()));
    }

    @Test
    void surplusDunJourNeVaPasSurUnAutreJourEnregistre() {
        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(List.of(
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 2, 8, 10), 540, 0),
                new SeanceDureeRepartition.SeanceSource(LocalDateTime.of(2026, 3, 4, 8, 40), 180, 1)
        ));
        assertEquals(3, creneaux.size());
        assertEquals(java.time.LocalDate.of(2026, 3, 2), creneaux.get(0).heureDebut().toLocalDate());
        assertEquals(java.time.LocalDate.of(2026, 3, 2), creneaux.get(1).heureDebut().toLocalDate());
        assertEquals(java.time.LocalDate.of(2026, 3, 4), creneaux.get(2).heureDebut().toLocalDate());
    }

    @Test
    void lendemainApresLaFinDePeriodeEstIgnore() {
        List<java.time.LocalDate> dates = List.of(
                java.time.LocalDate.of(2026, 9, 12),
                java.time.LocalDate.of(2026, 9, 13),
                java.time.LocalDate.of(2026, 9, 15)
        );
        Map<java.time.LocalDate, String> titres = Map.of(
                java.time.LocalDate.of(2026, 9, 12), "Projet libre (Partie 1)",
                java.time.LocalDate.of(2026, 9, 13), "Projet libre (Partie 1)",
                java.time.LocalDate.of(2026, 9, 15), "Projet libre (Partie 1)"
        );
        assertEquals(List.of(java.time.LocalDate.of(2026, 9, 12)),
                SeanceDureeRepartition.datesDePresence(dates, titres));
    }

    @Test
    void suiteConsecutifMemeModuleNeCreePasDeJoursTousLesDeuxJours() {
        List<java.time.LocalDate> dates = List.of(
                java.time.LocalDate.of(2026, 9, 11),
                java.time.LocalDate.of(2026, 9, 12),
                java.time.LocalDate.of(2026, 9, 13),
                java.time.LocalDate.of(2026, 9, 14),
                java.time.LocalDate.of(2026, 9, 15)
        );
        Map<java.time.LocalDate, String> titres = new java.util.HashMap<>();
        for (java.time.LocalDate d : dates) {
            titres.put(d, "Projet libre (Partie 1)");
        }
        assertEquals(List.of(
                        java.time.LocalDate.of(2026, 9, 11),
                        java.time.LocalDate.of(2026, 9, 12)),
                SeanceDureeRepartition.datesDePresence(dates, titres));
    }

    @Test
    void joursReelsAvecTrouSontConserves() {
        List<java.time.LocalDate> dates = List.of(
                java.time.LocalDate.of(2026, 8, 12),
                java.time.LocalDate.of(2026, 8, 15),
                java.time.LocalDate.of(2026, 8, 17)
        );
        Map<java.time.LocalDate, String> titres = Map.of(
                java.time.LocalDate.of(2026, 8, 12), "Scratch",
                java.time.LocalDate.of(2026, 8, 15), "Variables",
                java.time.LocalDate.of(2026, 8, 17), "Stylo"
        );
        assertEquals(dates, SeanceDureeRepartition.datesDePresence(dates, titres));
    }

    @Test
    void deuxJoursConsecutifsModulesDifferentsRestentDeuxPassages() {
        List<java.time.LocalDate> dates = List.of(
                java.time.LocalDate.of(2026, 3, 2),
                java.time.LocalDate.of(2026, 3, 3)
        );
        Map<java.time.LocalDate, String> titres = Map.of(
                java.time.LocalDate.of(2026, 3, 2), "Scratch",
                java.time.LocalDate.of(2026, 3, 3), "Variables"
        );
        assertEquals(dates, SeanceDureeRepartition.datesDePresence(dates, titres));
    }

    @Test
    void clusterAnieEstReconnuMemeAvecAccent() {
        assertTrue(SeanceDureeRepartition.estClusterAnie("Cluster Anié", null, null));
        assertTrue(SeanceDureeRepartition.estClusterAnie(null, "CDEJ HOLA d'Anié Kpotamé", null));
        assertTrue(!SeanceDureeRepartition.estClusterAnie("Cluster Lomé Est", "SKA Lomé", "Lomé"));
    }
}
