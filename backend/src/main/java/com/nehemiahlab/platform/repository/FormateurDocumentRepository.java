package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.FormateurDocument;
import com.nehemiahlab.platform.model.FormateurDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FormateurDocumentRepository extends JpaRepository<FormateurDocument, Long> {
    List<FormateurDocument> findByFormateurIdOrderByCreatedAtDesc(Long formateurId);

    List<FormateurDocument> findByFormateurIdAndTypeOrderByCreatedAtDesc(
            Long formateurId, FormateurDocumentType type);

    Optional<FormateurDocument> findByUrl(String url);
}
