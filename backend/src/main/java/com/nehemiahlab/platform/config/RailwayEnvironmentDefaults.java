package com.nehemiahlab.platform.config;

import org.springframework.core.env.Environment;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Valeurs par défaut pour le profil demo hébergé sur Railway lorsque certaines
 * variables ne sont pas encore configurées manuellement.
 */
public final class RailwayEnvironmentDefaults {

    static final String RAILWAY_CORS_FALLBACK = "https://*.up.railway.app";
    static final String RAILWAY_JWT_FALLBACK =
            "nehemiahlab-smart-kids-academy-railway-demo-jwt-secret-2026-change-me";

    private RailwayEnvironmentDefaults() {
    }

    public static boolean isRailway(Environment environment) {
        return RailwayDatabaseEnvironment.isUsable(environment.getProperty("RAILWAY_ENVIRONMENT"))
                || RailwayDatabaseEnvironment.isUsable(environment.getProperty("RAILWAY_PROJECT_ID"))
                || RailwayDatabaseEnvironment.isUsable(environment.getProperty("RAILWAY_SERVICE_ID"));
    }

    public static Map<String, Object> resolve(Environment environment) {
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
}
