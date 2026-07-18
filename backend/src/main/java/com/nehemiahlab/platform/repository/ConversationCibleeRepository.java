package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ConversationCiblee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationCibleeRepository extends JpaRepository<ConversationCiblee, Long> {
    List<ConversationCiblee> findAllByOrderByCreatedAtDesc();
}
