package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ResourceCategory;
import com.nehemiahlab.platform.model.RessourceItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RessourceItemRepository extends JpaRepository<RessourceItem, Long> {

    /**
     * spring.jpa.open-in-view=false en prod : la session Hibernate se ferme dès
     * la fin de la méthode du contrôleur, avant la sérialisation JSON. Or
     * RessourceItem#getFichiersApi() (appelée par Jackson) accède à la collection
     * "fichiers", chargée en LAZY par défaut — sans initialisation préalable, ça
     * levait une LazyInitializationException (500 sur /content-management/ressources
     * pour tous les rôles y ayant accès, dont FORMATEUR : la page « Ressources »
     * semblait en panne). @EntityGraph force le chargement de "fichiers" dans la
     * même requête, avant la fermeture de session.
     */
    @Override
    @EntityGraph(attributePaths = "fichiers")
    List<RessourceItem> findAll();

    @Override
    @EntityGraph(attributePaths = "fichiers")
    Optional<RessourceItem> findById(Long id);

    @EntityGraph(attributePaths = "fichiers")
    List<RessourceItem> findByActifTrueOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = "fichiers")
    List<RessourceItem> findByActifTrueAndCategorieOrderByUpdatedAtDesc(ResourceCategory categorie);
}
