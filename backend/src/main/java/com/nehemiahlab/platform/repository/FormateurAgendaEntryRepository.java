package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.FormateurAgendaEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormateurAgendaEntryRepository extends JpaRepository<FormateurAgendaEntry, Long> {
    @Query("""
            SELECT e FROM FormateurAgendaEntry e
            JOIN FETCH e.centre
            WHERE e.formateur.id = :formateurId
            ORDER BY e.jourSemaine ASC, e.heureDebut ASC
            """)
    List<FormateurAgendaEntry> findByFormateurIdOrderByJourSemaineAscHeureDebutAsc(@Param("formateurId") Long formateurId);
}
