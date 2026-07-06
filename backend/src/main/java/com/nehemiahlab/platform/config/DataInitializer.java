package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- DataInitializer starting ---");
        Optional<User> directorOpt = userRepository.findByEmail("director@nehemiahlab.com");
        
        if (directorOpt.isEmpty()) {
            System.out.println("No director found. Creating new account...");
            User director = User.builder()
                    .nom("Directeur")
                    .prenom("Jean")
                    .email("director@nehemiahlab.com")
                    .motDePasse(passwordEncoder.encode("password123"))
                    .role(Role.DIRECTEUR)
                    .telephone("+228 97 25 53 53")
                    .actif(true)
                    .build();
            userRepository.save(director);
            System.out.println("SUCCESS: Default directeur account created: director@nehemiahlab.com / password123");
        } else {
            System.out.println("Director found. Resetting password to ensure access...");
            User director = directorOpt.get();
            director.setMotDePasse(passwordEncoder.encode("password123"));
            userRepository.save(director);
            System.out.println("SUCCESS: Default directeur account password reset: director@nehemiahlab.com / password123");
        }
        System.out.println("--- DataInitializer finished ---");
    }
}
