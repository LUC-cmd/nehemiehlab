package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Débloque les comptes verrouillés au démarrage, sans modifier les mots de passe.
 */
@Component
public class LoginLockClearBootstrap {

    private static final Logger log = LoggerFactory.getLogger(LoginLockClearBootstrap.class);

    private final UserRepository userRepository;

    public LoginLockClearBootstrap(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void debloquerComptes() {
        try {
            int n = 0;
            for (User user : userRepository.findAll()) {
                if (user.getFailedLoginAttempts() == 0 && user.getLockedUntil() == null) {
                    continue;
                }
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
                n++;
            }
            if (n > 0) {
                log.info("Verrouillage connexion levé pour {} compte(s). Mots de passe inchangés.", n);
            }
        } catch (Exception e) {
            log.error("Déblocage des connexions ignoré : {}", e.getMessage());
        }
    }
}
