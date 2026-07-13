package com.nehemiahlab.platform.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;

/**
 * Applique tôt la configuration Railway (PostgreSQL, CORS, JWT) avant l'auto-configuration.
 */
public class RailwayEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String PROPERTY_SOURCE = "railwayEnvironmentOverrides";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> resolved = new java.util.LinkedHashMap<>(RailwayDatabaseEnvironment.resolve(environment));

        if (RailwayEnvironmentDefaults.isRailway(environment)) {
            if (RailwayEnvironmentDefaults.isDemoProfile(environment)) {
                RailwayEnvironmentDefaults.resolveDemo(environment).forEach(resolved::putIfAbsent);
            }
            RailwayEnvironmentDefaults.resolveRailwayCors(environment).forEach(resolved::put);
            requireDatabaseOnRailway(environment, resolved);
        }

        if (resolved.isEmpty()) {
            return;
        }
        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE, resolved));
    }

    private static void requireDatabaseOnRailway(ConfigurableEnvironment environment, Map<String, Object> resolved) {
        if (resolved.containsKey("DB_HOST") && resolved.containsKey("DB_NAME") && resolved.containsKey("DB_USER")) {
            return;
        }
        String profile = environment.getProperty("SPRING_PROFILES_ACTIVE", "local");
        if (!"field".equalsIgnoreCase(profile) && !"demo".equalsIgnoreCase(profile) && !"prod".equalsIgnoreCase(profile)) {
            return;
        }
        throw new IllegalStateException(
                "PostgreSQL non configuré sur Railway (DB_HOST introuvable). "
                        + "Sur nehemiahlab-api → Variables : supprimez DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD "
                        + "puis Add Reference → service Postgres → cochez DATABASE_URL (ou PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD).");
    }
}
