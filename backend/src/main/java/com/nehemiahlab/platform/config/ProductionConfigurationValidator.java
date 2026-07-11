package com.nehemiahlab.platform.config;

import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Empêche un démarrage de production avec des secrets absents ou une
 * configuration de sécurité manifestement dangereuse.
 */
@Component
@Profile("prod")
public class ProductionConfigurationValidator {

    private static final List<String> REQUIRED_ENVIRONMENT_VARIABLES = List.of(
            "DB_HOST",
            "DB_NAME",
            "DB_USER",
            "DB_PASSWORD",
            "JWT_SECRET",
            "CORS_ORIGINS",
            "MAIL_HOST",
            "MAIL_USERNAME",
            "MAIL_PASSWORD",
            "MAIL_FROM",
            "STORAGE_ENDPOINT",
            "STORAGE_BUCKET",
            "STORAGE_ACCESS_KEY",
            "STORAGE_SECRET_KEY"
    );

    public ProductionConfigurationValidator(Environment environment) {
        for (String variable : REQUIRED_ENVIRONMENT_VARIABLES) {
            requireNonBlank(environment, variable);
        }

        String jwtSecret = environment.getProperty("JWT_SECRET", "");
        if (jwtSecret.length() < 64) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins 64 caractères en production.");
        }

        String corsOrigins = environment.getProperty("CORS_ORIGINS", "");
        if (corsOrigins.contains("*") || !allOriginsUseHttps(corsOrigins)) {
            throw new IllegalStateException(
                    "CORS_ORIGINS doit contenir uniquement des origines HTTPS explicites en production.");
        }

        if (environment.getProperty("APP_SEED_ENABLED", Boolean.class, false)) {
            throw new IllegalStateException("APP_SEED_ENABLED doit rester désactivé en production.");
        }
    }

    private static void requireNonBlank(Environment environment, String variable) {
        String value = environment.getProperty(variable);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Variable d'environnement obligatoire manquante: " + variable);
        }
    }

    private static boolean allOriginsUseHttps(String origins) {
        return origins.lines()
                .flatMap(line -> List.of(line.split(",")).stream())
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .allMatch(origin -> origin.startsWith("https://"));
    }
}
