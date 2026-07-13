package com.nehemiahlab.platform.config;

import org.springframework.core.env.Environment;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Valeurs par défaut Railway (CORS, JWT demo) appliquées avant l'auto-configuration Spring.
 */
public final class RailwayEnvironmentDefaults {

    static final String RAILWAY_CORS_FALLBACK = "https://*.up.railway.app";
    static final String RAILWAY_JWT_FALLBACK =
            "nehemiahlab-smart-kids-academy-railway-demo-jwt-secret-2026-change-me";

    private RailwayEnvironmentDefaults() {
    }

    public static boolean isDemoProfile(Environment environment) {
        return "demo".equalsIgnoreCase(environment.getProperty("SPRING_PROFILES_ACTIVE"));
    }

    public static boolean isFieldProfile(Environment environment) {
        return "field".equalsIgnoreCase(environment.getProperty("SPRING_PROFILES_ACTIVE"));
    }

    public static boolean isRailway(Environment environment) {
        return RailwayDatabaseEnvironment.isUsable(environment.getProperty("RAILWAY_ENVIRONMENT"))
                || RailwayDatabaseEnvironment.isUsable(environment.getProperty("RAILWAY_PROJECT_ID"))
                || RailwayDatabaseEnvironment.isUsable(environment.getProperty("RAILWAY_SERVICE_ID"));
    }

    public static Map<String, Object> resolveDemo(Environment environment) {
        Map<String, Object> resolved = new LinkedHashMap<>();

        String corsOrigins = environment.getProperty("CORS_ORIGINS");
        if (!RailwayDatabaseEnvironment.isUsable(corsOrigins)) {
            resolved.put("CORS_ORIGINS", RAILWAY_CORS_FALLBACK);
        }

        String jwtSecret = environment.getProperty("JWT_SECRET");
        if (!RailwayDatabaseEnvironment.isUsable(jwtSecret) || jwtSecret.length() < 64) {
            resolved.put("JWT_SECRET", RAILWAY_JWT_FALLBACK);
        }

        return resolved;
    }

    public static Map<String, Object> resolveRailwayCors(Environment environment) {
        Map<String, Object> resolved = new LinkedHashMap<>();
        if (!isRailway(environment) || (!isDemoProfile(environment) && !isFieldProfile(environment))) {
            return resolved;
        }

        if (isFieldProfile(environment)) {
            String merged = mergeCorsOrigins(environment.getProperty("CORS_ORIGINS"), RAILWAY_CORS_FALLBACK);
            merged = mergePlatformUrl(environment, merged);
            resolved.put("CORS_ORIGINS", merged);
            return resolved;
        }

        String merged = mergeCorsOrigins(environment.getProperty("CORS_ORIGINS"), RAILWAY_CORS_FALLBACK);
        resolved.put("CORS_ORIGINS", merged);
        return resolved;
    }

    static String mergePlatformUrl(Environment environment, String cors) {
        String platformUrl = environment.getProperty("APP_PLATFORM_URL");
        if (!RailwayDatabaseEnvironment.isUsable(platformUrl)) {
            return cors;
        }
        String origin = normalizeOrigins(platformUrl);
        String merged = mergeCorsOrigins(cors, origin);
        if (origin.startsWith("https://") && !origin.startsWith("https://www.")) {
            merged = mergeCorsOrigins(merged, "https://www." + origin.substring("https://".length()));
        }
        return merged;
    }

    static String mergeCorsOrigins(String existing, String addition) {
        String normalizedExisting = normalizeOrigins(existing);
        String normalizedAddition = normalizeOrigins(addition);
        if (!RailwayDatabaseEnvironment.isUsable(normalizedAddition)) {
            return RailwayDatabaseEnvironment.isUsable(normalizedExisting) ? normalizedExisting : "";
        }
        if (!RailwayDatabaseEnvironment.isUsable(normalizedExisting)) {
            return normalizedAddition;
        }
        for (String origin : normalizedAddition.split(",")) {
            if (!normalizedExisting.contains(origin)) {
                normalizedExisting = normalizedExisting + "," + origin;
            }
        }
        return normalizedExisting;
    }

    static String normalizeOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            return "";
        }
        return origins.lines()
                .flatMap(line -> java.util.List.of(line.split(",")).stream())
                .map(String::trim)
                .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.joining(","));
    }
}
