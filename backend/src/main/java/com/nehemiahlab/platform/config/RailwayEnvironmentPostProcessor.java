package com.nehemiahlab.platform.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;

/**
 * Applique tôt la configuration Railway (PostgreSQL, CORS, JWT) avant l'auto-configuration.
 */
public class RailwayEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(RailwayEnvironmentPostProcessor.class);
    private static final String PROPERTY_SOURCE = "railwayEnvironmentOverrides";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> resolved = new java.util.LinkedHashMap<>(RailwayDatabaseEnvironment.resolve(environment));

        if (RailwayEnvironmentDefaults.isRailway(environment)) {
            if (RailwayEnvironmentDefaults.isDemoProfile(environment)) {
                RailwayEnvironmentDefaults.resolveDemo(environment).forEach(resolved::putIfAbsent);
            }
            RailwayEnvironmentDefaults.resolveRailwayCors(environment).forEach(resolved::put);
            applyResolvedCorsProperties(environment, resolved);
            warnIfMissingPlatformUrl(environment);
            requireDatabaseOnRailway(environment, resolved);
            logDatabaseTarget(resolved);
        }

        if (resolved.isEmpty()) {
            return;
        }
        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE, resolved));
    }

    private static void warnIfMissingPlatformUrl(ConfigurableEnvironment environment) {
        String platformUrl = environment.getProperty("APP_PLATFORM_URL");
        String corsOrigins = environment.getProperty("CORS_ORIGINS");
        if (RailwayDatabaseEnvironment.isUsable(platformUrl) || RailwayDatabaseEnvironment.isUsable(corsOrigins)) {
            return;
        }
        log.warn(
                "CORS/domaine custom : ajoutez APP_PLATFORM_URL=https://ska-management.com "
                        + "et CORS_ORIGINS=https://ska-management.com,https://www.ska-management.com sur nehemiahlab-api.");
    }

    private static void applyResolvedCorsProperties(ConfigurableEnvironment environment, Map<String, Object> resolved) {
        Object corsOrigins = resolved.get("CORS_ORIGINS");
        if (corsOrigins != null && !String.valueOf(corsOrigins).isBlank()) {
            resolved.put("app.cors.allowed-origins", corsOrigins);
        }
        String platformUrl = environment.getProperty("APP_PLATFORM_URL");
        if (RailwayDatabaseEnvironment.isUsable(platformUrl)) {
            resolved.put("app.platform.url", RailwayEnvironmentDefaults.normalizeOrigins(platformUrl));
        }
        if (corsOrigins != null) {
            log.info("CORS Railway préconfiguré: {}", corsOrigins);
        }
    }

    private static void logDatabaseTarget(Map<String, Object> resolved) {
        String host = stringValue(resolved.get("DB_HOST"));
        if (host == null || host.isBlank()) {
            log.warn("PostgreSQL Railway : DB_HOST non résolu — liez DATABASE_URL via Add Reference sur nehemiahlab-api.");
            return;
        }
        log.info(
                "PostgreSQL Railway : host={} port={} database={} user={} sslmode={}",
                host,
                stringValue(resolved.get("DB_PORT")),
                stringValue(resolved.get("DB_NAME")),
                stringValue(resolved.get("DB_USER")),
                stringValue(resolved.get("DB_SSL_MODE")));
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
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
