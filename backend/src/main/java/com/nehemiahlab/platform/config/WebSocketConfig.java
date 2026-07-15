package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.security.JwtTokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;

/**
 * WebSocket temps reel (STOMP) pour les notifications in-app.
   * Authentification: le client STOMP envoie "Authorization: Bearer <access token>"
   * dans les en-tetes natifs de la frame CONNECT (pas un en-tete HTTP classique).
   */
@Configuration
  @EnableWebSocketMessageBroker
  public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

  @Autowired
      private JwtTokenUtil jwtTokenUtil;

  @Override
      public void registerStompEndpoints(StompEndpointRegistry registry) {
            registry.addEndpoint("/ws")
                      .setAllowedOriginPatterns("*")
                      .withSockJS();
      }

  @Override
      public void configureMessageBroker(MessageBrokerRegistry registry) {
            registry.enableSimpleBroker("/topic", "/queue");
            registry.setApplicationDestinationPrefixes("/app");
            registry.setUserDestinationPrefix("/user");
      }

  @Override
      public void configureClientInboundChannel(ChannelRegistration registration) {
            registration.interceptors(new ChannelInterceptor() {
                    @Override
                    public Message<?> preSend(Message<?> message, MessageChannel channel) {
                              StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                              if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                                          String authHeader = accessor.getFirstNativeHeader("Authorization");
                                          if (authHeader != null && authHeader.startsWith("Bearer ")) {
                                                        String token = authHeader.substring(7).trim();
                                                        try {
                                                                        if (JwtTokenUtil.TYPE_ACCESS.equals(jwtTokenUtil.extractTokenType(token))) {
                                                                                          String email = jwtTokenUtil.extractUsername(token);
                                                                                          if (jwtTokenUtil.validateToken(token, email, JwtTokenUtil.TYPE_ACCESS)) {
                                                                                                              final String principalName = email;
                                                                                                              accessor.setUser((Principal) () -> principalName);
                                                                                            }
                                                                        }
                                                        } catch (Exception e) {
                                                                        log.warn("Connexion WebSocket refusee (token invalide): {}", e.getMessage());
      }
                                          }
}
        return message;
}
});
}
}
