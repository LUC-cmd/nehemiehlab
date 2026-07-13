package com.nehemiahlab.platform.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Construit la configuration CORS à partir des variables d'environnement résolues.
 */
public final class PlatformCorsConfiguration {

    private static final Logger log = LoggerFactory.getLogger(PlatformCorsConfiguration.class);

    private PlatformCorsConfiguration() {
    }

    public static CorsConfiguration build(Environment environment) {
        String corsOrigins = firstNonBlank(
                environment.getProperty("app.cors.allowed-origins"),
                environment.getProperty("CORS_ORIGINS"));
        String platformUrl = firstNonBlank(
                environment.getProperty("app.platform.url"),
                environment.getProperty("APP_PLATFORM_URL"));

        CorsConfiguration config = new CorsConfiguration();
        RailwayEnvironmentDefaults.applyCorsConfiguration(config, corsOrigins, platformUrl);

        var origins = RailwayEnvironmentDefaults.resolveAllowedOriginPatterns(corsOrigins, platformUrl);
        if (origins.isEmpty()) {
            log.error(
                    "CORS vide — configurez CORS_ORIGINS et/ou APP_PLATFORM_URL sur Railway "
                            + "(ex. https://ska-management.com).");
        } else {
            log.info("CORS configuré pour: {}", String.join(",", origins));
        }
        return config;
    }

    public static CorsConfigurationSource configurationSource(Environment environment) {
        CorsConfiguration config = build(environment);
        return request -> config;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (RailwayDatabaseEnvironment.isUsable(value)) {
                return value;
            }
        }
        return "";
    }
}
