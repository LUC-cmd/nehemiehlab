package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ModuleFormation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ModuleFormationRepository extends JpaRepository<ModuleFormation, Long> {
    List<ModuleFormation> findByCentreIdOrderByDateDesc(Long centreId);
    List<ModuleFormation> findByFormateurIdOrderByDateDesc(Long formateurId);
    List<ModuleFormation> findByFormateurId(Long formateurId);
    long countByFormateurId(Long formateurId);
    List<ModuleFormation> findByCentreIdAndDateBetween(Long centreId, LocalDate debut, LocalDate fin);
    List<ModuleFormation> findByFormateurIdAndDateBetween(Long formateurId, LocalDate debut, LocalDate fin);
}
