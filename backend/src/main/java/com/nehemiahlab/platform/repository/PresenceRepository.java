package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Presence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PresenceRepository extends JpaRepository<Presence, Long> {
    List<Presence> findByEleveId(Long eleveId);
    Optional<Presence> findByEleveIdAndSessionActiveTrue(Long eleveId);
    List<Presence> findByEleveIdAndDateBetween(Long eleveId, LocalDate debut, LocalDate fin);
}
