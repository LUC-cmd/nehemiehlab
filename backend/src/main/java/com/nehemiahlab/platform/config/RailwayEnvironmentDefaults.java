package com.nehemiahlab.platform.config;

import org.springframework.core.env.Environment;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Valeurs par défaut Railway (CORS, JWT demo) appliquées avant l'auto-configuration Spring.
 */
public final class RailwayEnvironmentDefaults {

    public static final String RAILWAY_CORS_FALLBACK = "https://*.up.railway.app";
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
        if (!isRailway(environment)) {
            return resolved;
        }

        String merged = resolveMergedCorsOrigins(
                environment.getProperty("CORS_ORIGINS"),
                environment.getProperty("APP_PLATFORM_URL"));
        resolved.put("CORS_ORIGINS", merged);
        return resolved;
    }

    /**
     * Fusionne CORS explicite, wildcard Railway et domaine plateforme (APP_PLATFORM_URL).
     */
    public static String resolveMergedCorsOrigins(String corsOrigins, String platformUrl) {
        String merged = mergeCorsOrigins(corsOrigins, RAILWAY_CORS_FALLBACK);
        return mergePlatformUrl(platformUrl, merged);
    }

    public static java.util.List<String> resolveAllowedOriginPatterns(String corsOrigins, String platformUrl) {
        String merged = resolveMergedCorsOrigins(corsOrigins, platformUrl);
        if (!RailwayDatabaseEnvironment.isUsable(merged)) {
            return java.util.List.of();
        }
        return java.util.Arrays.stream(merged.split(","))
                .map(String::trim)
                .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());
    }

    public static void applyCorsConfiguration(org.springframework.web.cors.CorsConfiguration config,
                                              String corsOrigins,
                                              String platformUrl) {
        java.util.List<String> origins = resolveAllowedOriginPatterns(corsOrigins, platformUrl);
        java.util.List<String> exactOrigins = origins.stream()
                .filter(origin -> !origin.contains("*"))
                .collect(Collectors.toList());
        java.util.List<String> originPatterns = origins.stream()
                .filter(origin -> origin.contains("*"))
                .collect(Collectors.toList());

        config.setAllowCredentials(true);
        if (!exactOrigins.isEmpty()) {
            config.setAllowedOrigins(exactOrigins);
        }
        if (!originPatterns.isEmpty()) {
            config.setAllowedOriginPatterns(originPatterns);
        }
        config.setAllowedHeaders(java.util.List.of(
                "Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setMaxAge(3600L);
    }

    static String mergePlatformUrl(Environment environment, String cors) {
        return mergePlatformUrl(environment.getProperty("APP_PLATFORM_URL"), cors);
    }

    static String mergePlatformUrl(String platformUrl, String cors) {
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
