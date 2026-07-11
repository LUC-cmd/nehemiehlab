package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.RefreshTokenSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenSessionRepository extends JpaRepository<RefreshTokenSession, Long> {
    Optional<RefreshTokenSession> findByTokenHash(String tokenHash);
}
