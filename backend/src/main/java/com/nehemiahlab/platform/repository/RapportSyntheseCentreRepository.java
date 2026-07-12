package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.RapportSyntheseCentre;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface RapportSyntheseCentreRepository extends JpaRepository<RapportSyntheseCentre, Long> {
    Optional<RapportSyntheseCentre> findByCentreIdAndModuleLabelAndAnnee(
            Long centreId, String moduleLabel, Integer annee);

    Optional<RapportSyntheseCentre> findByCentreIdAndModuleLabelAndDateDebutAndDateFin(
            Long centreId, String moduleLabel, LocalDate dateDebut, LocalDate dateFin);
}
