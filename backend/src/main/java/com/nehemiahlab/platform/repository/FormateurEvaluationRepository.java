package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.FormateurEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FormateurEvaluationRepository extends JpaRepository<FormateurEvaluation, Long> {

    List<FormateurEvaluation> findByFormateurIdOrderByCreatedAtDesc(Long formateurId);

    List<FormateurEvaluation> findAllByOrderByCreatedAtDesc();
}
