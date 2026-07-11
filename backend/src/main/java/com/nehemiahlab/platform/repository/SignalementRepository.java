package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Signalement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SignalementRepository extends JpaRepository<Signalement, Long> {
    List<Signalement> findByEleveId(Long eleveId);
    List<Signalement> findByEleveIdOrderByCreatedAtDesc(Long eleveId);
    List<Signalement> findByEleveIdInOrderByCreatedAtDesc(List<Long> eleveIds);
    List<Signalement> findByCentreIdInOrderByCreatedAtDesc(List<Long> centreIds);
    List<Signalement> findAllByOrderByCreatedAtDesc();
    List<Signalement> findByStatut(String statut);
    long countByStatut(String statut);
}
