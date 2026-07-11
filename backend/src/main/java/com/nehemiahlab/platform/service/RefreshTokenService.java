package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.RefreshTokenSession;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.RefreshTokenSessionRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.JwtTokenUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class RefreshTokenService {

    private final RefreshTokenSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final JwtTokenUtil jwtTokenUtil;

    public RefreshTokenService(
            RefreshTokenSessionRepository sessionRepository,
            UserRepository userRepository,
            JwtTokenUtil jwtTokenUtil
    ) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.jwtTokenUtil = jwtTokenUtil;
    }

    @Transactional
    public TokenPair issue(User user) {
        String accessToken = jwtTokenUtil.generateToken(user);
        String refreshToken = jwtTokenUtil.generateRefreshToken(user);
        persist(user, refreshToken);
        return new TokenPair(accessToken, refreshToken);
    }

    @Transactional
    public Optional<TokenPair> rotate(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank() || refreshToken.length() > 4096) {
            return Optional.empty();
        }
        RefreshTokenSession session = sessionRepository.findByTokenHash(hash(refreshToken)).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        if (session == null || session.getRevokedAt() != null || session.getExpiresAt().isBefore(now)) {
            return Optional.empty();
        }

        User user = userRepository.findById(session.getUserId()).orElse(null);
        if (user == null || !user.isActif()
                || !jwtTokenUtil.validateToken(refreshToken, user.getEmail(), JwtTokenUtil.TYPE_REFRESH)) {
            session.setRevokedAt(now);
            sessionRepository.save(session);
            return Optional.empty();
        }

        session.setRevokedAt(now);
        sessionRepository.save(session);
        return Optional.of(issue(user));
    }

    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank() || refreshToken.length() > 4096) return;
        sessionRepository.findByTokenHash(hash(refreshToken)).ifPresent(session -> {
            if (session.getRevokedAt() == null) {
                session.setRevokedAt(LocalDateTime.now());
                sessionRepository.save(session);
            }
        });
    }

    private void persist(User user, String refreshToken) {
        LocalDateTime expiresAt = jwtTokenUtil.extractExpiration(refreshToken).toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
        sessionRepository.save(RefreshTokenSession.builder()
                .userId(user.getId())
                .tokenHash(hash(refreshToken))
                .expiresAt(expiresAt)
                .build());
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de protéger le jeton de rafraîchissement.", e);
        }
    }

    public record TokenPair(String accessToken, String refreshToken) {
    }
}
