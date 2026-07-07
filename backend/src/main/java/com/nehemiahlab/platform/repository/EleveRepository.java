package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Eleve;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EleveRepository extends JpaRepository<Eleve, Long> {
    List<Eleve> findByCentre(Centre centre);
    List<Eleve> findByCentreId(Long centreId);
    long countByCentreId(Long centreId);
}
