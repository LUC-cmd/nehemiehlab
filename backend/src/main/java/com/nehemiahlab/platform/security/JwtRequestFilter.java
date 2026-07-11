package com.nehemiahlab.platform.security;

import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        String username = null;
        String jwt = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7).trim();
            // Refuser les tokens trop longs (anti DoS)
            if (jwt.length() > 4096) {
                chain.doFilter(request, response);
                return;
            }
            try {
                // Un refresh token ne doit jamais authentifier une API
                String typ = jwtTokenUtil.extractTokenType(jwt);
                if (JwtTokenUtil.TYPE_REFRESH.equals(typ)) {
                    chain.doFilter(request, response);
                    return;
                }
                username = jwtTokenUtil.extractUsername(jwt);
            } catch (Exception e) {
                // Token invalide → reste anonyme
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            User user = this.userRepository.findByEmailIgnoreCase(username).orElse(null);

            if (user != null
                    && user.isActif()
                    && jwtTokenUtil.validateToken(jwt, user.getEmail(), JwtTokenUtil.TYPE_ACCESS)) {
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        chain.doFilter(request, response);
    }
}
