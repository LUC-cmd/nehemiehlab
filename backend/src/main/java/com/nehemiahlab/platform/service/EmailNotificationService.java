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
    private static final String SENDER_NAME = "Smart Kids Academy";

    private final JavaMailSender mailSender;
    private final String from;
    private final String otpFrom;
    private final String replyTo;
    private final String mailUsername;

    public EmailNotificationService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:contact@nehemiahlab.com}") String from,
            @Value("${app.mail.otp-from:${app.mail.from:contact@nehemiahlab.com}}") String otpFrom,
            @Value("${app.mail.reply-to:${app.mail.from:contact@nehemiahlab.com}}") String replyTo,
            @Value("${spring.mail.username:}") String mailUsername
    ) {
        this.mailSender = mailSender;
        this.from = from == null ? "" : from.trim();
        this.otpFrom = otpFrom == null || otpFrom.isBlank() ? this.from : otpFrom.trim();
        this.replyTo = replyTo == null || replyTo.isBlank() ? this.from : replyTo.trim();
        this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
    }

    public boolean isConfigured() {
        return !mailUsername.isBlank();
    }

    public boolean sendSafe(String to, String subject, String body) {
        String html = EmailHtmlTemplates.wrapHtml(subject, EmailHtmlTemplates.notificationHtml(body));
        String plain = EmailHtmlTemplates.notificationPlain(body);
        return sendBranded(from, to, subject, plain, html);
    }

    public boolean sendOtp(String to, String nomComplet, String code) {
        String prenom = firstName(nomComplet);
        String subject = "Votre code Smart Kids Academy (valide 10 min)";
        String plain = EmailHtmlTemplates.otpPlain(prenom, code);
        String html = EmailHtmlTemplates.wrapHtml("Réinitialisation du mot de passe", EmailHtmlTemplates.otpHtml(prenom, code));
        return sendBranded(otpFrom, to, subject, plain, html);
    }

    public boolean sendFormateurInscriptionConfirmation(String email, String prenom, String nom) {
        String name = fullName(prenom, nom);
        String subject = "Smart Kids Academy — inscription enregistrée";
        String plain = EmailHtmlTemplates.inscriptionPlain(name);
        String html = EmailHtmlTemplates.wrapHtml("Inscription enregistrée", EmailHtmlTemplates.inscriptionHtml(name));
        return sendBranded(from, email, subject, plain, html);
    }

    public boolean sendFormateurCompteValide(String email, String prenom, String nom) {
        String name = fullName(prenom, nom);
        String subject = "Smart Kids Academy — votre compte est activé";
        String plain = EmailHtmlTemplates.validePlain(name);
        String html = EmailHtmlTemplates.wrapHtml("Compte activé", EmailHtmlTemplates.valideHtml(name));
        return sendBranded(from, email, subject, plain, html);
    }

    private boolean sendBranded(String fromAddress, String to, String subject, String plainBody, String htmlBody) {
        if (to == null || to.isBlank()) return false;
        if (!isConfigured()) {
            log.warn("Email non envoye (SMTP non configure) vers {} — sujet: {}", to, subject);
            return false;
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, SENDER_NAME);
            helper.setReplyTo(replyTo);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(plainBody, htmlBody);
            mimeMessage.setHeader("Auto-Submitted", "auto-generated");
            mimeMessage.setHeader("X-Auto-Response-Suppress", "All");
            mailSender.send(mimeMessage);
            log.info("Email envoye vers {} — sujet: {}", to, subject);
            return true;
        } catch (Exception e) {
            log.error("Echec envoi email vers {} — sujet: {} — cause: {}", to, subject, e.getMessage(), e);
            return false;
        }
    }

    private static String fullName(String prenom, String nom) {
        return ((prenom == null ? "" : prenom.trim()) + " " + (nom == null ? "" : nom.trim())).trim();
    }

    private static String firstName(String nomComplet) {
        if (nomComplet == null || nomComplet.isBlank()) return "Utilisateur";
        String trimmed = nomComplet.trim();
        int space = trimmed.indexOf(' ');
        return space > 0 ? trimmed.substring(0, space) : trimmed;
    }
}
