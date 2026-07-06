package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Commentaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommentaireRepository extends JpaRepository<Commentaire, Long> {
    List<Commentaire> findByEleveIdOrderByCreatedAtDesc(Long eleveId);
}
