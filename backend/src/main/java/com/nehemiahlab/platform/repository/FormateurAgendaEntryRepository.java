package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.FormateurAgendaEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormateurAgendaEntryRepository extends JpaRepository<FormateurAgendaEntry, Long> {
    List<FormateurAgendaEntry> findByFormateurIdOrderByJourSemaineAscHeureDebutAsc(Long formateurId);
}
