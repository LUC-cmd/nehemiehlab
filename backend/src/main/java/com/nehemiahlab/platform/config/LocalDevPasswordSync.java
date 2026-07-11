package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Profil local : garantit le compte directeur historique et remet les mots de passe
 * staff de démonstration à chaque démarrage.
 */
@Component
@Profile("local")
@Order(1000)
public class LocalDevPasswordSync implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalDevPasswordSync.class);

    @Value("${app.seed.director-email:director@nehemiahlab.com}")
    private String primaryDirectorEmail;

    @Value("${app.seed.director-password:password123}")
    private String directorPassword;

    @Value("${app.seed.demo-password:password123}")
    private String demoPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LocalDevPasswordSync(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        int updated = 0;
        String encodedDirector = passwordEncoder.encode(directorPassword);

        Set<String> directorEmails = new LinkedHashSet<>(List.of(
                normalize(primaryDirectorEmail),
                "director@nehemiahlab.com",
                "director@localhost"
        ));

        for (String email : directorEmails) {
            updated += userRepository.findByEmailIgnoreCase(email)
                    .map(user -> saveStaff(user, encodedDirector))
                    .orElse(0);
        }

        if (userRepository.findByEmailIgnoreCase("director@nehemiahlab.com").isEmpty()) {
            userRepository.save(User.builder()
                    .nom("Directeur")
                    .prenom("Jean")
                    .email("director@nehemiahlab.com")
                    .motDePasse(encodedDirector)
                    .role(Role.DIRECTEUR)
                    .telephone("+228 97 25 53 53")
                    .actif(true)
                    .build());
            updated++;
        }

        String encodedDemo = passwordEncoder.encode(demoPassword);
        for (User user : userRepository.findAll()) {
            String email = user.getEmail();
            if (email != null && email.toLowerCase().endsWith("@ska.tg")) {
                updated += saveStaff(user, encodedDemo);
            }
        }

        log.info("Synchronisation locale terminée ({} compte(s) staff mis à jour).", updated);
    }

    private int saveStaff(User user, String encodedPassword) {
        user.setMotDePasse(encodedPassword);
        user.setActif(true);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        return 1;
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
