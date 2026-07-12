package com.nehemiahlab.platform.config;

import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Validation allégée pour le profil demo (présentation gratuite Render/Neon).
 */
@Component
@Profile("demo")
public class DemoConfigurationValidator {

    public DemoConfigurationValidator(Environment environment) {
        var databaseConfig = RailwayDatabaseEnvironment.resolve(environment);
        requireDatabaseField(databaseConfig, "DB_HOST");
        requireDatabaseField(databaseConfig, "DB_NAME");
        requireDatabaseField(databaseConfig, "DB_USER");
        requireDatabaseField(databaseConfig, "DB_PASSWORD");
        requireNonBlank(environment, "JWT_SECRET");
        requireNonBlank(environment, "CORS_ORIGINS");

        String jwtSecret = environment.getProperty("JWT_SECRET", "");
        if (jwtSecret.length() < 64) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins 64 caractères.");
        }

        String corsOrigins = environment.getProperty("CORS_ORIGINS", "");
        if (!allOriginsUseHttps(corsOrigins)) {
            throw new IllegalStateException(
                    "CORS_ORIGINS doit contenir uniquement des origines HTTPS explicites "
                            + "(ex. https://votre-frontend.up.railway.app ou https://*.up.railway.app).");
        }
    }

    private static void requireDatabaseField(java.util.Map<String, Object> databaseConfig, String field) {
        Object value = databaseConfig.get(field);
        if (value == null || String.valueOf(value).isBlank()) {
            throw new IllegalStateException(
                    "Connexion PostgreSQL non configurée (" + field + "). "
                            + "Sur Railway : liez PostgreSQL via Add Reference → DATABASE_URL "
                            + "ou PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD.");
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
                .flatMap(line -> java.util.List.of(line.split(",")).stream())
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .allMatch(origin -> origin.startsWith("https://"));
    }
}
