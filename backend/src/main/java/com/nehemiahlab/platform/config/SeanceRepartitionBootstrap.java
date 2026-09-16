package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.service.SeanceRepartitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Après démarrage : en arrière-plan, enlève les jours inventés (sans bloquer la connexion).
 * Ne touche pas aux comptes ni aux mots de passe.
 */
@Component
public class SeanceRepartitionBootstrap {

    private static final Logger log = LoggerFactory.getLogger(SeanceRepartitionBootstrap.class);

    private final SeanceRepartitionService seanceRepartitionService;

    public SeanceRepartitionBootstrap(SeanceRepartitionService seanceRepartitionService) {
        this.seanceRepartitionService = seanceRepartitionService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void auDemarrage() {
        Thread worker = new Thread(() -> {
            try {
                int n = seanceRepartitionService.compacteDatesTousLesCentres();
                if (n > 0) {
                    log.info("Séances ramenées aux jours de présence pour {} centre(s).", n);
                }
            } catch (Exception e) {
                log.error("Compactage des dates ignoré : l'API reste disponible. {}", e.getMessage(), e);
            }
        }, "compact-dates-seances");
        worker.setDaemon(true);
        worker.start();
    }
}
