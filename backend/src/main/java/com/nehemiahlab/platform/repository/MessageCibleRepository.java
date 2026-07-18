package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.MessageCible;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageCibleRepository extends JpaRepository<MessageCible, Long> {
    /** Les 200 messages les plus recents d'une conversation ciblee (ordre decroissant). */
    List<MessageCible> findTop200ByConversationIdOrderByCreatedAtDesc(Long conversationId);

    long countByConversationId(Long conversationId);
}
