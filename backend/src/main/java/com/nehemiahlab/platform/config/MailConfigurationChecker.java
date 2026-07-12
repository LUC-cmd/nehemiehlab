package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.service.EmailNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Avertit clairement au démarrage si le SMTP n'est pas configuré
 * (inscription formateur, validation, OTP, alertes).
 */
@Component
public class MailConfigurationChecker {

    private static final Logger log = LoggerFactory.getLogger(MailConfigurationChecker.class);

    private final EmailNotificationService emailNotificationService;

    public MailConfigurationChecker(EmailNotificationService emailNotificationService) {
        this.emailNotificationService = emailNotificationService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void checkMailOnStartup() {
        if (emailNotificationService.isConfigured()) {
            log.info("SMTP configure — envoi d'emails actif (inscription, validation, OTP, alertes).");
            return;
        }
        log.warn("""
                
                ========================================================================
                SMTP NON CONFIGURE — les utilisateurs ne recevront AUCUN email.
                Renseignez sur le serveur (ou dans backend/.env en local) :
                  MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
                  MAIL_FROM, MAIL_OTP_FROM
                ========================================================================
                """);
    }
}
