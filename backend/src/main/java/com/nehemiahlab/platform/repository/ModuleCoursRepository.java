package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ModuleCours;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleCoursRepository extends JpaRepository<ModuleCours, Long> {

    List<ModuleCours> findAllByOrderByNumeroOrdreAscTitreAsc();

    List<ModuleCours> findByActifTrueOrderByNumeroOrdreAscTitreAsc();
}
