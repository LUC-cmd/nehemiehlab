package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Eleve;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EleveRepository extends JpaRepository<Eleve, Long> {
    List<Eleve> findByCentre(Centre centre);
    List<Eleve> findByCentreId(Long centreId);
    long countByCentreId(Long centreId);

    Optional<Eleve> findByMatriculeIgnoreCase(String matricule);
    boolean existsByMatricule(String matricule);

    @Query("SELECT MAX(e.matricule) FROM Eleve e WHERE e.matricule LIKE CONCAT(:prefix, '%')")
    Optional<String> findMaxMatriculeByPrefix(@Param("prefix") String prefix);

    List<Eleve> findByMatriculeIsNull();
}
