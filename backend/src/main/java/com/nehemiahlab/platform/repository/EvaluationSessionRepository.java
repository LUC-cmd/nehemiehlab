package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.EvaluationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvaluationSessionRepository extends JpaRepository<EvaluationSession, Long> {
    List<EvaluationSession> findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(Long sessionCoursId);
    List<EvaluationSession> findByEleveId(Long eleveId);
    EvaluationSession findBySessionCoursIdAndEleveId(Long sessionCoursId, Long eleveId);
    java.util.Optional<EvaluationSession> findByProjetFichierUrl(String projetFichierUrl);

    /**
     * Projection légère (eleveId, note) pour calculer la performance moyenne de
     * plusieurs élèves en une seule requête, au lieu d'une requête par élève
     * (évite le N+1 sur les listes de centre).
     */
    @Query("SELECT ev.eleve.id AS eleveId, ev.note AS note FROM EvaluationSession ev WHERE ev.eleve.id IN :eleveIds")
    List<Object[]> findEleveIdAndNoteByEleveIdIn(@Param("eleveIds") List<Long> eleveIds);
}
