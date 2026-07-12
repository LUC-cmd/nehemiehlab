package com.nehemiahlab.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PasswordResetOtpService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetOtpService.class);

    private static class OtpEntry {
        private final String code;
        private final long expiresAtEpochMs;

        private OtpEntry(String code, long expiresAtEpochMs) {
            this.code = code;
            this.expiresAtEpochMs = expiresAtEpochMs;
        }
    }

    private final EmailNotificationService emailNotificationService;
    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();

    public PasswordResetOtpService(EmailNotificationService emailNotificationService) {
        this.emailNotificationService = emailNotificationService;
    }

    public void generateAndSend(String email, String nomComplet) {
        if (!emailNotificationService.isConfigured()) {
            throw new IllegalStateException(
                    "SMTP non configure : renseignez MAIL_USERNAME et MAIL_PASSWORD (mot de passe d'application Gmail)."
            );
        }

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        long expiry = Instant.now().toEpochMilli() + 10 * 60 * 1000;
        String key = email.trim().toLowerCase();
        store.put(key, new OtpEntry(code, expiry));

        boolean sent = emailNotificationService.sendOtp(key, nomComplet, code);
        if (!sent) {
            store.remove(key);
            log.error("Echec envoi OTP vers {}", key);
            throw new IllegalStateException(
                    "Impossible d'envoyer l'email OTP. Verifiez MAIL_PASSWORD et que l'adresse d'envoi correspond au compte Gmail."
            );
        }
        log.info("OTP envoye avec succes a {}", key);
    }

    public boolean validate(String email, String code) {
        if (email == null || code == null) return false;
        String key = email.trim().toLowerCase();
        OtpEntry entry = store.get(key);
        if (entry == null) return false;
        if (Instant.now().toEpochMilli() > entry.expiresAtEpochMs) {
            store.remove(key);
            return false;
        }
        boolean ok = entry.code.equals(code.trim());
        if (ok) store.remove(key);
        return ok;
    }
}
