package com.nehemiahlab.platform.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * CORS explicite avant Spring Security — corrige le 403 preflight depuis ska-management.com.
 */
@Configuration
public class PlatformCorsFilterConfig {

    private static final Logger log = LoggerFactory.getLogger(PlatformCorsFilterConfig.class);

    static final String SKA_ORIGIN = "https://ska-management.com";
    static final String SKA_WWW_ORIGIN = "https://www.ska-management.com";

    @Bean
    public FilterRegistrationBean<PlatformCorsFilter> platformCorsFilterRegistration(Environment environment) {
        Set<String> allowedOrigins = buildAllowedOrigins(environment);
        log.info("CORS filtre servlet actif pour: {}", String.join(", ", allowedOrigins));

        FilterRegistrationBean<PlatformCorsFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new PlatformCorsFilter(allowedOrigins));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        registration.setName("platformCorsFilter");
        return registration;
    }

    static Set<String> buildAllowedOrigins(Environment environment) {
        String corsOrigins = firstNonBlank(
                environment.getProperty("app.cors.allowed-origins"),
                environment.getProperty("CORS_ORIGINS"));
        String platformUrl = firstNonBlank(
                environment.getProperty("app.platform.url"),
                environment.getProperty("APP_PLATFORM_URL"));

        Set<String> origins = new LinkedHashSet<>();
        origins.add(SKA_ORIGIN);
        origins.add(SKA_WWW_ORIGIN);

        RailwayEnvironmentDefaults.resolveAllowedOriginPatterns(corsOrigins, platformUrl).stream()
                .filter(origin -> !origin.contains("*"))
                .forEach(origins::add);

        return origins;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (RailwayDatabaseEnvironment.isUsable(value)) {
                return value;
            }
        }
        return "";
    }

    static final class PlatformCorsFilter extends OncePerRequestFilter {

        private final Set<String> allowedOrigins;

        PlatformCorsFilter(Set<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            String origin = request.getHeader("Origin");
            if (origin == null || origin.isBlank()) {
                filterChain.doFilter(request, response);
                return;
            }

            if (!allowedOrigins.contains(origin)) {
                if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                }
                filterChain.doFilter(request, response);
                return;
            }

            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
            response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,X-Requested-With");
            response.setHeader("Access-Control-Max-Age", "3600");
            response.setHeader("Vary", "Origin");

            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                response.setStatus(HttpServletResponse.SC_OK);
                return;
            }

            filterChain.doFilter(request, response);
        }
    }
}
