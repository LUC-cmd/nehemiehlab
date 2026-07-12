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
            RailwayEnvironmentDefaults.resolve(environment).forEach(resolved::putIfAbsent);
        }

        if (resolved.isEmpty()) {
            return;
        }
        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE, resolved));
    }
}
