package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CentreRepository extends JpaRepository<Centre, Long> {
    List<Centre> findByCoordinateur(User coordinateur);
    List<Centre> findByRegion(String region);
    List<Centre> findByCluster(String cluster);
    java.util.Optional<Centre> findByNomIgnoreCase(String nom);

    @Query("SELECT c FROM Centre c JOIN c.formateurs f WHERE f.id = :formateurId")
    List<Centre> findByFormateurId(@Param("formateurId") Long formateurId);

    @Query("SELECT DISTINCT c.cluster FROM Centre c WHERE c.cluster IS NOT NULL AND c.cluster <> '' ORDER BY c.cluster")
    List<String> findDistinctClusters();
}
