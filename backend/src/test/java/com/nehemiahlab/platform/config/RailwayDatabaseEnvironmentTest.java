package com.nehemiahlab.platform.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RailwayDatabaseEnvironmentTest {

    @Test
    void resolvesFromDatabaseUrl() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("DATABASE_URL", "postgresql://user:secret@db.railway.internal:5432/railway");

        Map<String, Object> resolved = RailwayDatabaseEnvironment.resolve(env);

        assertEquals("db.railway.internal", resolved.get("DB_HOST"));
        assertEquals("5432", resolved.get("DB_PORT"));
        assertEquals("railway", resolved.get("DB_NAME"));
        assertEquals("user", resolved.get("DB_USER"));
        assertEquals("secret", resolved.get("DB_PASSWORD"));
        assertEquals("disable", resolved.get("DB_SSL_MODE"));
    }

    @Test
    void sslModeDisableForRailwayInternalHost() {
        assertEquals("disable", RailwayDatabaseEnvironment.sslModeForHost("postgres.railway.internal"));
        assertEquals("prefer", RailwayDatabaseEnvironment.sslModeForHost("containers-us-west-123.railway.app"));
    }

    @Test
    void resolveMergedCorsOriginsIncludesPlatformUrl() {
        String merged = RailwayEnvironmentDefaults.resolveMergedCorsOrigins(
                "https://ska-management.com",
                "https://ska-management.com");

        assertTrue(merged.contains("https://ska-management.com"));
        assertTrue(merged.contains("https://www.ska-management.com"));
        assertTrue(merged.contains("https://*.up.railway.app"));
    }

    @Test
    void resolveAllowedOriginPatternsReturnsDistinctOrigins() {
        var patterns = RailwayEnvironmentDefaults.resolveAllowedOriginPatterns(
                "https://ska-management.com",
                "https://ska-management.com");

        assertTrue(patterns.contains("https://ska-management.com"));
        assertTrue(patterns.contains("https://www.ska-management.com"));
    }

    @Test
    void resolvesFromPgVariables() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("PGHOST", "postgres.railway.internal");
        env.setProperty("PGPORT", "5432");
        env.setProperty("PGDATABASE", "nehemiahlab");
        env.setProperty("PGUSER", "postgres");
        env.setProperty("PGPASSWORD", "pass");

        Map<String, Object> resolved = RailwayDatabaseEnvironment.resolve(env);

        assertEquals("postgres.railway.internal", resolved.get("DB_HOST"));
        assertEquals("nehemiahlab", resolved.get("DB_NAME"));
        assertEquals("postgres", resolved.get("DB_USER"));
        assertEquals("pass", resolved.get("DB_PASSWORD"));
    }

    @Test
    void ignoresUnresolvedDbHostPlaceholder() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("DB_HOST", "${DB_HOST}");
        env.setProperty("DB_NAME", "railway");
        env.setProperty("DB_USER", "postgres");
        env.setProperty("DB_PASSWORD", "pass");

        Map<String, Object> resolved = RailwayDatabaseEnvironment.resolve(env);

        assertFalse(resolved.containsKey("DB_HOST"));
        assertEquals("railway", resolved.get("DB_NAME"));
    }

    @Test
    void detectsUnresolvedRailwayReferenceSyntax() {
        assertTrue(RailwayDatabaseEnvironment.looksUnresolved("${{Postgres.PGHOST}}"));
    }

    @Test
    void railwayDefaultsApplyWhenOnRailwayWithoutJwtOrCors() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_PROFILES_ACTIVE", "demo");
        env.setProperty("RAILWAY_ENVIRONMENT", "production");
        env.setProperty("DATABASE_URL", "postgresql://user:secret@db.railway.internal:5432/railway");

        Map<String, Object> database = RailwayDatabaseEnvironment.resolve(env);
        Map<String, Object> defaults = RailwayEnvironmentDefaults.resolveDemo(env);

        assertEquals("db.railway.internal", database.get("DB_HOST"));
        assertEquals(RailwayEnvironmentDefaults.RAILWAY_CORS_FALLBACK, defaults.get("CORS_ORIGINS"));
        assertEquals(RailwayEnvironmentDefaults.RAILWAY_JWT_FALLBACK, defaults.get("JWT_SECRET"));
    }

    @Test
    void railwayFieldProfileForcesWildcardCors() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_PROFILES_ACTIVE", "field");
        env.setProperty("RAILWAY_ENVIRONMENT", "production");

        Map<String, Object> cors = RailwayEnvironmentDefaults.resolveRailwayCors(env);

        assertEquals(RailwayEnvironmentDefaults.RAILWAY_CORS_FALLBACK, cors.get("CORS_ORIGINS"));
    }

    @Test
    void railwayFieldProfileKeepsCustomDomainCors() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_PROFILES_ACTIVE", "field");
        env.setProperty("RAILWAY_ENVIRONMENT", "production");
        env.setProperty("CORS_ORIGINS", "https://www.nehemiahlab.com");

        Map<String, Object> cors = RailwayEnvironmentDefaults.resolveRailwayCors(env);

        assertEquals(
                "https://www.nehemiahlab.com,https://*.up.railway.app",
                cors.get("CORS_ORIGINS"));
    }

    @Test
    void railwayFieldProfileUsesPlatformUrlForCors() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_PROFILES_ACTIVE", "field");
        env.setProperty("RAILWAY_ENVIRONMENT", "production");
        env.setProperty("APP_PLATFORM_URL", "https://ska-management.com");

        Map<String, Object> cors = RailwayEnvironmentDefaults.resolveRailwayCors(env);

        assertEquals(
                "https://*.up.railway.app,https://ska-management.com,https://www.ska-management.com",
                cors.get("CORS_ORIGINS"));
    }

    @Test
    void railwayFieldProfileNormalizesExplicitCors() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_PROFILES_ACTIVE", "field");
        env.setProperty("RAILWAY_ENVIRONMENT", "production");
        env.setProperty("CORS_ORIGINS", "https://nehemiahlab-web-production.up.railway.app/");

        Map<String, Object> cors = RailwayEnvironmentDefaults.resolveRailwayCors(env);

        assertEquals(
                "https://nehemiahlab-web-production.up.railway.app,https://*.up.railway.app",
                cors.get("CORS_ORIGINS"));
    }

    @Test
    void railwayDefaultsKeepExplicitJwtAndCors() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_PROFILES_ACTIVE", "demo");
        env.setProperty("RAILWAY_ENVIRONMENT", "production");
        env.setProperty("CORS_ORIGINS", "https://mon-frontend.up.railway.app");
        env.setProperty("JWT_SECRET", "a".repeat(64));

        Map<String, Object> defaults = RailwayEnvironmentDefaults.resolveDemo(env);

        assertTrue(defaults.isEmpty());
    }
}
