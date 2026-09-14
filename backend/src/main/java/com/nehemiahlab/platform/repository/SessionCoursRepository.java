package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.SessionCours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionCoursRepository extends JpaRepository<SessionCours, Long> {
    List<SessionCours> findByCentreIdOrderByCreatedAtDesc(Long centreId);
    List<SessionCours> findByFormateurIdOrderByCreatedAtDesc(Long formateurId);
    // Tri par date reelle de la seance (heureDebut) et non par date d'enregistrement :
    // une seance datee du 13 mais saisie le 20 doit apparaitre a sa place chronologique
    // (entre les seances du 12 et du 14), pas en tete de liste.
    List<SessionCours> findByFormateurIdOrderByHeureDebutDesc(Long formateurId);
    List<SessionCours> findByFormateurIdAndStatut(Long formateurId, String statut);
    List<SessionCours> findByStatut(String statut);
    List<SessionCours> findAllByOrderByCreatedAtDesc();
    List<SessionCours> findAllByOrderByHeureDebutDesc();
    Optional<SessionCours> findByRapportUrl(String rapportUrl);
}
