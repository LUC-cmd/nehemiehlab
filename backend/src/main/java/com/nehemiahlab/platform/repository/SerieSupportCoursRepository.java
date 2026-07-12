package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.SerieSupportCours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SerieSupportCoursRepository extends JpaRepository<SerieSupportCours, Long> {

    List<SerieSupportCours> findAllByOrderByOrdreAscTitreAsc();

    @Query("""
            SELECT DISTINCT s FROM SerieSupportCours s
            JOIN s.modules m
            WHERE s.actif = true AND m.actif = true
            ORDER BY s.ordre ASC, s.titre ASC
            """)
    List<SerieSupportCours> findAllActiveForFormateurs();

    @Query("""
            SELECT DISTINCT s FROM SerieSupportCours s
            JOIN s.modules m
            WHERE m.id = :moduleId AND s.actif = true
            AND (:director = true OR m.actif = true)
            ORDER BY s.ordre ASC, s.titre ASC
            """)
    List<SerieSupportCours> findByModuleId(
            @Param("moduleId") Long moduleId,
            @Param("director") boolean director
    );
}
