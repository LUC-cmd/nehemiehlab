package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Actualite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActualiteRepository extends JpaRepository<Actualite, Long> {
    List<Actualite> findByActifTrueOrderByCreatedAtDesc();
    List<Actualite> findAllByOrderByCreatedAtDesc();
}
