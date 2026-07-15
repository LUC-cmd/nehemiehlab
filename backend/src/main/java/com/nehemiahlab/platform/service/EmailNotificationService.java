package com.nehemiahlab.platform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Envoi d'emails via l'API HTTP de Resend (https://resend.com).
 * <p>
 * Railway bloque les connexions SMTP sortantes (ports 25/465/587) sur le plan
 * Hobby, ce qui rendait l'envoi direct via SMTP Gmail impossible (timeout de
 * connexion systematique, quel que soit IPv4/IPv6 ou les identifiants).
 * L'API Resend fonctionne en HTTPS (port 443), jamais bloque par Railway.
 */
@Service
public class EmailNotificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
    private static final String SENDER_NAME = "Smart Kids Academy";
    private static final URI RESEND_ENDPOINT = URI.create("https://api.resend.com/emails");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String apiKey;
    private final String from;
    private final String otpFrom;
    private final String replyTo;

    public EmailNotificationService(
            @Value("${app.mail.resend-api-key:}") String apiKey,
            @Value("${app.mail.from:contact@nehemiahlab.com}") String from,
            @Value("${app.mail.otp-from:${app.mail.from:contact@nehemiahlab.com}}") String otpFrom,
            @Value("${app.mail.reply-to:${app.mail.from:contact@nehemiahlab.com}}") String replyTo
    ) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.from = from == null ? "" : from.trim();
        this.otpFrom = otpFrom == null || otpFrom.isBlank() ? this.from : otpFrom.trim();
        this.replyTo = replyTo == null || replyTo.isBlank() ? this.from : replyTo.trim();
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
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
            log.warn("Email non envoye (RESEND_API_KEY non configuree) vers {} — sujet: {}", to, subject);
            return false;
        }
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("from", SENDER_NAME + " <" + fromAddress + ">");
            payload.put("to", List.of(to.trim()));
            payload.put("reply_to", replyTo);
            payload.put("subject", subject);
            payload.put("html", htmlBody);
            payload.put("text", plainBody);

            String json = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder(RESEND_ENDPOINT)
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Email envoye (Resend) vers {} — sujet: {}", to, subject);
                return true;
            }
            log.error("Echec envoi email (Resend) vers {} — sujet: {} — HTTP {} — {}", to, subject, response.statusCode(), response.body());
            return false;
        } catch (Exception e) {
            log.error("Echec envoi email (Resend) vers {} — sujet: {} — cause: {}", to, subject, e.getMessage(), e);
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
