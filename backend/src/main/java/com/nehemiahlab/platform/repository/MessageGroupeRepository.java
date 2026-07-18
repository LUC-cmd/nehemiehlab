package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.CanalDiscussion;
import com.nehemiahlab.platform.model.MessageGroupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageGroupeRepository extends JpaRepository<MessageGroupe, Long> {
    List<MessageGroupe> findByCanalOrderByCreatedAtAsc(CanalDiscussion canal);

    /**
     * Les 200 messages les plus recents d'un canal (ordre decroissant), pour
     * eviter de charger l'historique complet a chaque poll (le frontend
     * interroge cet endpoint toutes les 8 secondes).
     */
    List<MessageGroupe> findTop200ByCanalOrderByCreatedAtDesc(CanalDiscussion canal);

    long countByCanal(CanalDiscussion canal);
}
