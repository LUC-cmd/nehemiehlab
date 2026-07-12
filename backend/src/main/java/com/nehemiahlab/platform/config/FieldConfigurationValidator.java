package com.nehemiahlab.platform.config;

import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Validation pour le déploiement terrain : secrets obligatoires, pas de seed ni S3 requis.
 */
@Component
@Profile("field")
public class FieldConfigurationValidator {

    private static final List<String> REQUIRED_ENVIRONMENT_VARIABLES = List.of(
            "JWT_SECRET",
            "CORS_ORIGINS",
            "MAIL_HOST",
            "MAIL_USERNAME",
            "MAIL_PASSWORD",
            "MAIL_FROM"
    );

    public FieldConfigurationValidator(Environment environment) {
        Map<String, Object> databaseConfig = RailwayDatabaseEnvironment.resolve(environment);
        requireDatabaseField(databaseConfig, "DB_HOST");
        requireDatabaseField(databaseConfig, "DB_NAME");
        requireDatabaseField(databaseConfig, "DB_USER");
        requireDatabaseField(databaseConfig, "DB_PASSWORD");

        for (String variable : REQUIRED_ENVIRONMENT_VARIABLES) {
            requireNonBlank(environment, variable);
        }

        String jwtSecret = environment.getProperty("JWT_SECRET", "");
        if (jwtSecret.length() < 64) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins 64 caractères.");
        }

        String corsOrigins = environment.getProperty("CORS_ORIGINS", "");
        if (!allOriginsUseHttps(corsOrigins)) {
            throw new IllegalStateException(
                    "CORS_ORIGINS doit contenir uniquement des origines HTTPS explicites.");
        }

        if (environment.getProperty("APP_SEED_ENABLED", Boolean.class, false)) {
            requireNonBlank(environment, "APP_SEED_DIRECTOR_PASSWORD");
        }
    }

    private static void requireDatabaseField(Map<String, Object> databaseConfig, String field) {
        Object value = databaseConfig.get(field);
        if (value == null || String.valueOf(value).isBlank()) {
            throw new IllegalStateException(
                    "Connexion PostgreSQL non configurée (" + field + "). "
                            + "Sur Railway : liez PostgreSQL via Add Reference → DATABASE_URL.");
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
