package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.service.SeanceRepartitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Après démarrage : en arrière-plan, compacte uniquement le cluster Anié (sans bloquer la connexion).
 * Les autres centres ne sont pas touchés : dates et horaires restent ceux saisis.
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
        log.info("Aucun compactage au démarrage : les séances déjà en base ne sont ni supprimées ni recalé.");
    }
}
