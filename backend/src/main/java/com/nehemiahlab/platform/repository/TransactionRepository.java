package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByFormateurIdOrderByCreatedAtDesc(Long formateurId);
    List<Transaction> findByStatutOrderByCreatedAtDesc(String statut);
    List<Transaction> findByFormateurIdAndStatutOrderByCreatedAtDesc(Long formateurId, String statut);
    List<Transaction> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime debut, LocalDateTime fin);
    List<Transaction> findByFormateurIdAndCreatedAtBetweenOrderByCreatedAtDesc(Long formateurId, LocalDateTime debut, LocalDateTime fin);
    long countByStatut(String statut);
    long countByFormateurIdAndStatut(Long formateurId, String statut);
}
