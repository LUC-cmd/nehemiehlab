package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.service.SeanceRepartitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Au démarrage terrain : découpe les longues séances déjà enregistrées en blocs de 3 h.
 * Ne touche pas aux comptes ni aux mots de passe. Idempotent si déjà en 3 h.
 */
@Component
@ConditionalOnProperty(name = "app.seances.repartir-au-demarrage", havingValue = "true", matchIfMissing = true)
public class SeanceRepartitionBootstrap {

    private static final Logger log = LoggerFactory.getLogger(SeanceRepartitionBootstrap.class);

    private final SeanceRepartitionService seanceRepartitionService;

    public SeanceRepartitionBootstrap(SeanceRepartitionService seanceRepartitionService) {
        this.seanceRepartitionService = seanceRepartitionService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void auDemarrage() {
        try {
            int n = seanceRepartitionService.repartirTousLesCentresSiBesoin();
            if (n > 0) {
                log.info("Découpage des séances existantes terminé pour {} centre(s).", n);
            } else {
                log.info("Aucune longue séance à découper (données inchangées).");
            }
        } catch (Exception e) {
            log.error("Découpage des séances ignoré : l'API reste disponible, comptes et données conservés. {}", e.getMessage(), e);
        }
    }
}
