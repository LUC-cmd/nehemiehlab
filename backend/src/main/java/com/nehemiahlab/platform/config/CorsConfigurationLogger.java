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
    private final String platformUrl;

    public CorsConfigurationLogger(
            @Value("${app.cors.allowed-origins:}") String allowedOrigins,
            @Value("${app.platform.url:}") String platformUrl) {
        this.allowedOrigins = allowedOrigins;
        this.platformUrl = platformUrl;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logCorsOrigins() {
        String merged = RailwayEnvironmentDefaults.resolveMergedCorsOrigins(allowedOrigins, platformUrl);
        log.info("CORS actif pour les origines: {}", merged);
    }
}
