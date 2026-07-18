package com.nehemiahlab.platform.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.http.HttpStatus;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Autowired
    private AuthRateLimitFilter authRateLimitFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(AbstractHttpConfigurer::disable)
            .csrf(AbstractHttpConfigurer::disable)
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
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/site/**").permitAll()
                                   .requestMatchers("/ws/**").permitAll()
                .requestMatchers(HttpMethod.GET,
                        "/uploads/avatars/**",
                        "/secure-files/avatars/**",
                        "/uploads/actualites/**",
                        "/uploads/publications/**",
                        "/uploads/galerie/**",
                        "/uploads/community/**",
                        "/uploads/ressources/**"
                ).permitAll()
                .requestMatchers("/uploads/identite/**", "/uploads/transactions/**",
                        "/uploads/enfants/**", "/uploads/projets-enfants/**", "/uploads/rapports/**").denyAll()
                .requestMatchers("/uploads/**").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Sans ceci, Spring Security renvoie 403 (au lieu de 401) des qu'un jeton est
            // absent/expire/invalide, car aucun mecanisme d'authentification (formLogin,
            // httpBasic) n'est configure pour fournir un AuthenticationEntryPoint par defaut.
            // Or le frontend ne tente un rafraichissement silencieux du token que sur un 401 :
            // sans ce 401 explicite, une session expiree provoque une boucle infinie de
            // toasts "Acces refuse" au lieu de rafraichir le jeton ou de rediriger vers /connexion.
            .exceptionHandling(exceptions -> exceptions
                    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
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
}
