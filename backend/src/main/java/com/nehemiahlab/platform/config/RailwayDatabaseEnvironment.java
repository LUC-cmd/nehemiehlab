package com.nehemiahlab.platform.config;

import org.springframework.core.env.Environment;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Normalise la configuration PostgreSQL injectée par Railway (PG*, DATABASE_URL)
 * vers les variables DB_* attendues par Spring.
 */
public final class RailwayDatabaseEnvironment {

    private RailwayDatabaseEnvironment() {
    }

    public static Map<String, Object> resolve(Environment environment) {
        Map<String, Object> resolved = new LinkedHashMap<>();

        String databaseUrl = firstNonBlank(
                environment.getProperty("DATABASE_URL"),
                environment.getProperty("DATABASE_PRIVATE_URL"),
                environment.getProperty("DATABASE_PUBLIC_URL"));
        if (isUsable(databaseUrl)) {
            applyDatabaseUrl(resolved, databaseUrl);
            return resolved;
        }

        String pgHost = environment.getProperty("PGHOST");
        if (isUsable(pgHost)) {
            putIfUsable(resolved, "DB_HOST", pgHost);
            resolved.put("DB_SSL_MODE", sslModeForHost(pgHost));
            putIfUsable(resolved, "DB_PORT", environment.getProperty("PGPORT"));
            putIfUsable(resolved, "DB_NAME", environment.getProperty("PGDATABASE"));
            putIfUsable(resolved, "DB_USER", environment.getProperty("PGUSER"));
            putIfUsable(resolved, "DB_PASSWORD", environment.getProperty("PGPASSWORD"));
            String pgPort = resolved.containsKey("DB_PORT") ? String.valueOf(resolved.get("DB_PORT")) : "5432";
            String pgDb = resolved.containsKey("DB_NAME") ? String.valueOf(resolved.get("DB_NAME")) : "railway";
            resolved.put("spring.datasource.url",
                    "jdbc:postgresql://" + pgHost + ":" + pgPort + "/" + pgDb
                            + "?sslmode=" + sslModeForHost(pgHost));
            if (resolved.containsKey("DB_USER")) {
                resolved.put("spring.datasource.username", resolved.get("DB_USER"));
            }
            if (resolved.containsKey("DB_PASSWORD")) {
                resolved.put("spring.datasource.password", resolved.get("DB_PASSWORD"));
            }
            return resolved;
        }

        copyIfUsable(resolved, environment, "DB_HOST");
        copyIfUsable(resolved, environment, "DB_PORT");
        copyIfUsable(resolved, environment, "DB_NAME");
        copyIfUsable(resolved, environment, "DB_USER");
        copyIfUsable(resolved, environment, "DB_PASSWORD");

        return resolved;
    }

    static void applyDatabaseUrl(Map<String, Object> resolved, String databaseUrl) {
        try {
            URI uri = new URI(databaseUrl.replace("postgresql://", "postgres://"));
            String userInfo = uri.getUserInfo();
            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath();
            String databaseName = path != null && path.length() > 1
                    ? path.substring(1).split("\\?")[0]
                    : "railway";

            if (userInfo != null) {
                String[] parts = userInfo.split(":", 2);
                resolved.put("DB_USER", URLDecoder.decode(parts[0], StandardCharsets.UTF_8));
                if (parts.length > 1) {
                    resolved.put("DB_PASSWORD", URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
                }
            }
            if (host != null) {
                resolved.put("DB_HOST", host);
                resolved.put("DB_SSL_MODE", sslModeForHost(host));
                // Court-circuite les placeholders ${DB_*} des fichiers de profil :
                // on impose directement l'URL JDBC complete, prioritaire sur tout le reste.
                resolved.put("spring.datasource.url",
                        "jdbc:postgresql://" + host + ":" + port + "/" + databaseName
                                + "?sslmode=" + sslModeForHost(host));
                Object user = resolved.get("DB_USER");
                if (user != null) {
                    resolved.put("spring.datasource.username", user);
                }
                Object password = resolved.get("DB_PASSWORD");
                if (password != null) {
                    resolved.put("spring.datasource.password", password);
                }
            }
            resolved.put("DB_PORT", String.valueOf(port));
            resolved.put("DB_NAME", databaseName);
        } catch (Exception ignored) {
            // Laisser la validation de démarrage signaler une config invalide.
        }
    }

    static boolean isUsable(String value) {
        return value != null && !value.isBlank() && !looksUnresolved(value);
    }

    static boolean looksUnresolved(String value) {
        return value.contains("${") || value.contains("${{");
    }

    /** Réseau privé Railway : pas de SSL ; proxy public : préférer SSL sans forcer. */
    static String sslModeForHost(String host) {
        if (host == null || host.isBlank()) {
            return "prefer";
        }
        String normalized = host.toLowerCase();
        if (normalized.contains("railway.internal")) {
            return "disable";
        }
        return "prefer";
    }

    private static void copyIfUsable(Map<String, Object> resolved, Environment environment, String key) {
        putIfUsable(resolved, key, readRawProperty(environment, key));
    }

    private static String readRawProperty(Environment environment, String key) {
        if (environment instanceof ConfigurableEnvironment configurable) {
            for (PropertySource<?> source : configurable.getPropertySources()) {
                if (source.containsProperty(key)) {
                    Object raw = source.getProperty(key);
                    return raw == null ? null : String.valueOf(raw);
                }
            }
        }
        return environment.getProperty(key);
    }

    private static void putIfUsable(Map<String, Object> resolved, String key, String value) {
        if (isUsable(value)) {
            resolved.put(key, value);
        }
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (isUsable(value)) {
                return value;
            }
        }
        return null;
    }
}
