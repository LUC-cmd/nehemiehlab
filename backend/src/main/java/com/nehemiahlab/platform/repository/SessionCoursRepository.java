package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.SessionCours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SessionCoursRepository extends JpaRepository<SessionCours, Long> {
    List<SessionCours> findByCentreIdOrderByCreatedAtDesc(Long centreId);
    List<SessionCours> findByFormateurIdOrderByCreatedAtDesc(Long formateurId);
    List<SessionCours> findAllByOrderByCreatedAtDesc();
}
