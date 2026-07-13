package com.nehemiahlab.platform.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtre CORS exécuté avant Spring Security — indispensable avec context-path /api.
 */
@Configuration
public class PlatformCorsFilterConfig {

    @Bean
    public FilterRegistrationBean<PlatformCorsFilter> platformCorsFilterRegistration(Environment environment) {
        CorsConfiguration configuration = PlatformCorsConfiguration.build(environment);
        FilterRegistrationBean<PlatformCorsFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new PlatformCorsFilter(configuration));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        registration.setName("platformCorsFilter");
        return registration;
    }

    static final class PlatformCorsFilter extends OncePerRequestFilter {

        private final CorsConfiguration configuration;
        private final DefaultCorsProcessor processor = new DefaultCorsProcessor();

        PlatformCorsFilter(CorsConfiguration configuration) {
            this.configuration = configuration;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            processor.processRequest(configuration, request, response);
            if (CorsUtils.isPreFlightRequest(request)) {
                return;
            }
            filterChain.doFilter(request, response);
        }
    }
}
