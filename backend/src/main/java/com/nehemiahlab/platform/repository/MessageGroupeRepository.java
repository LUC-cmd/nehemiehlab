package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.CanalDiscussion;
import com.nehemiahlab.platform.model.MessageGroupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageGroupeRepository extends JpaRepository<MessageGroupe, Long> {
    List<MessageGroupe> findByCanalOrderByCreatedAtAsc(CanalDiscussion canal);

    long countByCanal(CanalDiscussion canal);
}
