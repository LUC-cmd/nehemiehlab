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
        requireDatabaseVariable(environment, "PGHOST", "DB_HOST");
        requireDatabaseVariable(environment, "PGDATABASE", "DB_NAME");
        requireDatabaseVariable(environment, "PGUSER", "DB_USER");
        requireDatabaseVariable(environment, "PGPASSWORD", "DB_PASSWORD");
        requireNonBlank(environment, "JWT_SECRET");
        requireNonBlank(environment, "CORS_ORIGINS");

        String jwtSecret = environment.getProperty("JWT_SECRET", "");
        if (jwtSecret.length() < 64) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins 64 caractères.");
        }

        String corsOrigins = environment.getProperty("CORS_ORIGINS", "");
        if (corsOrigins.contains("*") || !allOriginsUseHttps(corsOrigins)) {
            throw new IllegalStateException(
                    "CORS_ORIGINS doit contenir uniquement des origines HTTPS explicites.");
        }
    }

    private static void requireDatabaseVariable(Environment environment, String railwayVar, String legacyVar) {
        String value = firstNonBlank(
                environment.getProperty(railwayVar),
                environment.getProperty(legacyVar));
        if (value == null || value.isBlank() || looksUnresolved(value)) {
            throw new IllegalStateException(
                    "Connexion PostgreSQL non configurée (" + railwayVar + " ou " + legacyVar + "). "
                            + "Sur Railway : + New → Database → PostgreSQL, puis connectez la base au service nehemiahlab-api.");
        }
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    private static boolean looksUnresolved(String value) {
        return value.startsWith("${") && value.endsWith("}");
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
