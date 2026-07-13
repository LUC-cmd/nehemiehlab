package com.nehemiahlab.platform.security;

import com.nehemiahlab.platform.config.RailwayEnvironmentDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Autowired
    private AuthRateLimitFilter authRateLimitFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173}")
    private String allowedOrigins;

    @Value("${app.platform.url:}")
    private String platformUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                    .contentTypeOptions(contentType -> {})
                    .frameOptions(frame -> frame.deny())
                    .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                    .httpStrictTransportSecurity(hsts -> hsts
                            .includeSubDomains(true)
                            .maxAgeInSeconds(31536000))
                    .xssProtection(xss -> xss.headerValue(
                            org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK
                    ))
                    .contentSecurityPolicy(csp -> csp.policyDirectives(
                            "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
                    ))
            )
            .authorizeHttpRequests(auth -> auth
                // Disponibilité sans détails sensibles.
                .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                // Auth publique
                .requestMatchers("/auth/**").permitAll()
                // Contenu site public
                .requestMatchers("/site/**").permitAll()
                // Médias publics uniquement (pas CNI / justificatifs)
                .requestMatchers(HttpMethod.GET,
                        "/uploads/avatars/**",
                        "/secure-files/avatars/**",
                        "/uploads/actualites/**",
                        "/uploads/publications/**",
                        "/uploads/galerie/**",
                        "/uploads/community/**",
                        "/uploads/ressources/**"
                ).permitAll()
                // Données d'enfants, rapports, CNI et justificatifs: jamais servis publiquement.
                .requestMatchers("/uploads/identite/**", "/uploads/transactions/**",
                        "/uploads/enfants/**", "/uploads/projets-enfants/**", "/uploads/rapports/**").denyAll()
                .requestMatchers("/uploads/**").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        List<String> origins = RailwayEnvironmentDefaults.resolveAllowedOriginPatterns(allowedOrigins, platformUrl);
        config.setAllowedOriginPatterns(origins);
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setMaxAge(3600L);
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
