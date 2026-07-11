package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findByActifTrueOrderByOrdreAscCreatedAtDesc();
    List<Publication> findAllByOrderByOrdreAscCreatedAtDesc();
}
