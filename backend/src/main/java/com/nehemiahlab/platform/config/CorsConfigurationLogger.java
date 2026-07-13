package com.nehemiahlab.platform.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class CorsConfigurationLogger {

    private static final Logger log = LoggerFactory.getLogger(CorsConfigurationLogger.class);

    private final String allowedOrigins;

    public CorsConfigurationLogger(@Value("${app.cors.allowed-origins:}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logCorsOrigins() {
        log.info("CORS actif pour les origines: {}", allowedOrigins);
    }
}
