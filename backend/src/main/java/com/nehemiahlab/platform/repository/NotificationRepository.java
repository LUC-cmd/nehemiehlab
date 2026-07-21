package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByUserIdAndLuFalseOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndLuFalse(Long userId);
    /** Notifications non lues d'un type donne (ex. DISCUSSION), pour les marquer lues
     * automatiquement quand l'utilisateur consulte le contenu correspondant. */
    List<Notification> findByUserIdAndTypeAndLuFalse(Long userId, String type);
}
