package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.EnfantProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EnfantProfileRepository extends JpaRepository<EnfantProfile, Long> {

    /**
     * spring.jpa.open-in-view=false en prod : la session Hibernate se ferme dès
     * la fin de la méthode du contrôleur, avant la sérialisation JSON. Or
     * EnfantProfile#projets est une collection LAZY sérialisée directement par
     * Jackson (pas de JsonIgnore) — sans initialisation préalable, ça levait une
     * LazyInitializationException (500 sur /content-management/enfants pour tous
     * les rôles, dont FORMATEUR : le panneau « Mes profils enfants » du tableau
     * de bord semblait en panne dès la connexion, tout comme la modification
     * d'un profil ou l'upload de sa photo, et la vue Directeur via findAll()).
     * @EntityGraph force le chargement de "projets" dans la même requête, avant
     * la fermeture de session.
     */
    @Override
    @EntityGraph(attributePaths = "projets")
    List<EnfantProfile> findAll();

    @Override
    @EntityGraph(attributePaths = "projets")
    Optional<EnfantProfile> findById(Long id);

    @EntityGraph(attributePaths = "projets")
    List<EnfantProfile> findByActifTrueOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = "projets")
    List<EnfantProfile> findByCentreIdIn(Collection<Long> centreIds);

    Optional<EnfantProfile> findByEleveId(Long eleveId);
    Optional<EnfantProfile> findByPhotoUrl(String photoUrl);
}
