package com.nehemiahlab.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limitation des tentatives sur les endpoints d'authentification (anti brute-force).
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_ATTEMPTS = 20;
    private static final long WINDOW_MS = 15 * 60 * 1000L;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if (!"POST".equalsIgnoreCase(method)) return true;
        return !(path.endsWith("/auth/login")
                || path.endsWith("/auth/login-parent")
                || path.endsWith("/auth/password-reset/request-otp")
                || path.endsWith("/auth/password-reset/confirm")
                || path.endsWith("/auth/inscription-formateur"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String key = clientKey(request);
        Window window = windows.compute(key, (k, existing) -> {
            long now = Instant.now().toEpochMilli();
            if (existing == null || now - existing.startMs > WINDOW_MS) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (window.count.get() > MAX_ATTEMPTS) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Trop de tentatives. Réessayez dans quelques minutes.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String clientKey(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        String ip = (xf != null && !xf.isBlank()) ? xf.split(",")[0].trim() : request.getRemoteAddr();
        return ip + "|" + request.getRequestURI();
    }

    private static final class Window {
        final long startMs;
        final AtomicInteger count;

        Window(long startMs, AtomicInteger count) {
            this.startMs = startMs;
            this.count = count;
        }
    }
}
