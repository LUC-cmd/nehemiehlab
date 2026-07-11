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

    public void sendSafe(String to, String subject, String body) {
        if (to == null || to.isBlank()) return;
        if (mailUsername.isBlank()) {
            log.warn("Email non envoye (SMTP non configure) vers {}", to);
            return;
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
        } catch (Exception e) {
            log.warn("Envoi email echoue vers {}: {}", to, e.getMessage());
        }
    }
}
