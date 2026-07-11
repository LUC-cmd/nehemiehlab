package com.nehemiahlab.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;

@Service
public class EmailNotificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final String mailUsername;

    public EmailNotificationService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@nehemiahlab.com}") String from,
            @Value("${spring.mail.username:}") String mailUsername
    ) {
        this.mailSender = mailSender;
        this.from = from;
        this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
    }

    public boolean sendSafe(String to, String subject, String body) {
        if (to == null || to.isBlank()) return false;
        if (mailUsername.isBlank()) {
            log.warn("Email non envoye (SMTP non configure) vers {}", to);
            return false;
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(mimeMessage);
            log.info("Email envoye vers {}", to);
            return true;
        } catch (Exception e) {
            log.warn("Envoi email echoue vers {}: {}", to, e.getMessage());
            return false;
        }
    }

    public boolean sendFormateurInscriptionConfirmation(String email, String prenom, String nom) {
        String name = (prenom == null ? "" : prenom.trim()) + " " + (nom == null ? "" : nom.trim());
        return sendSafe(
                email,
                "Inscription Smart Kids Academy — en attente de validation",
                "Bonjour " + name.trim() + ",\n\n"
                        + "Votre inscription formateur sur Smart Kids Academy a bien ete enregistree.\n\n"
                        + "Votre compte est en attente de validation par le Directeur. "
                        + "Vous recevrez un second email des que votre compte sera active.\n\n"
                        + "En attendant, vous ne pouvez pas encore vous connecter.\n\n"
                        + "Smart Kids Academy — Nehemiah Lab"
        );
    }

    public boolean sendFormateurCompteValide(String email, String prenom, String nom) {
        String name = (prenom == null ? "" : prenom.trim()) + " " + (nom == null ? "" : nom.trim());
        return sendSafe(
                email,
                "Compte Smart Kids Academy valide — vous pouvez vous connecter",
                "Bonjour " + name.trim() + ",\n\n"
                        + "Bonne nouvelle : le Directeur a valide votre compte formateur.\n\n"
                        + "Vous pouvez maintenant vous connecter sur la plateforme avec votre email "
                        + "et le mot de passe choisi lors de l'inscription.\n\n"
                        + "Smart Kids Academy — Nehemiah Lab"
        );
    }
}
