package com.nehemiahlab.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
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

    private final JavaMailSender mailSender;
    private final String from;
    private final String mailUsername;
    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();

    public PasswordResetOtpService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@nehemiahlab.com}") String from,
            @Value("${spring.mail.username:}") String mailUsername
    ) {
        this.mailSender = mailSender;
        this.from = from;
        this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
    }

    public void generateAndSend(String email, String nomComplet) {
        if (mailUsername.isBlank()) {
            throw new IllegalStateException(
                    "SMTP non configure : renseignez spring.mail.username et spring.mail.password (mot de passe d'application Gmail)."
            );
        }

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        long expiry = Instant.now().toEpochMilli() + 10 * 60 * 1000;
        String key = email.trim().toLowerCase();
        store.put(key, new OtpEntry(code, expiry));

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(key);
            helper.setSubject("Code OTP - Recuperation mot de passe SKA");
            helper.setText(
                    "Bonjour " + nomComplet + ",\n\n"
                            + "Votre code OTP Smart Kids Academy est : " + code + "\n\n"
                            + "Ce code expire dans 10 minutes.\n"
                            + "Si vous n'avez pas demande cette reinitialisation, ignorez cet email.\n\n"
                            + "Ne partagez jamais ce code.\n\n"
                            + "Smart Kids Academy",
                    false
            );
            mailSender.send(mimeMessage);
            log.info("OTP envoye avec succes a {}", key);
        } catch (Exception e) {
            store.remove(key);
            log.error("Echec envoi OTP vers {} : {}", key, e.getMessage(), e);
            throw new IllegalStateException(
                    "Impossible d'envoyer l'email OTP. Verifiez le mot de passe d'application Gmail (MAIL_PASSWORD) et que l'adresse existe dans la plateforme.",
                    e
            );
        }
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
