package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.EvaluationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvaluationSessionRepository extends JpaRepository<EvaluationSession, Long> {
    List<EvaluationSession> findBySessionCoursId(Long sessionCoursId);
    List<EvaluationSession> findByEleveId(Long eleveId);
    EvaluationSession findBySessionCoursIdAndEleveId(Long sessionCoursId, Long eleveId);
}
