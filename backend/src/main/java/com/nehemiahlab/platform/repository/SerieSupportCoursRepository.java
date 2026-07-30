package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.SerieSupportCours;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SerieSupportCoursRepository extends JpaRepository<SerieSupportCours, Long> {

    /**
     * spring.jpa.open-in-view=false en prod : la session Hibernate se ferme dès
     * la fin de la méthode du contrôleur, avant la sérialisation JSON. Or
     * SerieSupportCours#getFichiersApi() (appelée par Jackson) accède à la
     * collection "fichiers", chargée en LAZY par défaut — sans initialisation
     * préalable, ça levait une LazyInitializationException (500 sur
     * /series-supports-cours pour tous les rôles, dont FORMATEUR : la page
     * « Supports de cours » semblait en panne). @EntityGraph / LEFT JOIN FETCH
     * forcent le chargement de "fichiers" dans la même requête.
     */
    @Override
    @EntityGraph(attributePaths = "fichiers")
    Optional<SerieSupportCours> findById(Long id);

    @EntityGraph(attributePaths = "fichiers")
    List<SerieSupportCours> findAllByOrderByOrdreAscTitreAsc();

    @Query("""
            SELECT DISTINCT s FROM SerieSupportCours s
            JOIN s.modules m
            LEFT JOIN FETCH s.fichiers
            WHERE s.actif = true AND m.actif = true
            ORDER BY s.ordre ASC, s.titre ASC
            """)
    List<SerieSupportCours> findAllActiveForFormateurs();

    @Query("""
            SELECT DISTINCT s FROM SerieSupportCours s
            JOIN s.modules m
            LEFT JOIN FETCH s.fichiers
            WHERE m.id = :moduleId AND s.actif = true
            AND (:director = true OR m.actif = true)
            ORDER BY s.ordre ASC, s.titre ASC
            """)
    List<SerieSupportCours> findByModuleId(
            @Param("moduleId") Long moduleId,
            @Param("director") boolean director
    );
}
