package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.PreRegistration;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.PreRegistrationRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.JwtTokenUtil;
import lombok.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PreRegistrationRepository preRegistrationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        System.out.println("Login attempt for email: " + request.getEmail());
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        
        if (userOpt.isEmpty()) {
            System.out.println("Login failed: User not found for email: " + request.getEmail());
            return ResponseEntity.status(401).body(Map.of("message", "Email ou mot de passe incorrect."));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getMotDePasse(), user.getMotDePasse())) {
            System.out.println("Login failed: Password mismatch for user: " + user.getEmail());
            return ResponseEntity.status(401).body(Map.of("message", "Email ou mot de passe incorrect."));
        }

        if (!user.isActif()) {
            System.out.println("Login failed: User is inactive: " + user.getEmail());
            return ResponseEntity.status(403).body(Map.of("message", "Votre compte a été désactivé. Contactez l'administrateur."));
        }

        System.out.println("Login successful for user: " + user.getEmail());
        String token = jwtTokenUtil.generateToken(user);
        String refreshToken = jwtTokenUtil.generateRefreshToken(user);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("refreshToken", refreshToken);
        response.put("user", user);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/inscription-formateur")
    public ResponseEntity<?> inscriptionFormateur(@RequestBody InscriptionFormateurRequest request) {
        // 1. Vérifier si le formateur a été pré-enregistré par le Directeur
        Optional<PreRegistration> preRegOpt = preRegistrationRepository
                .findByNomIgnoreCaseAndPrenomIgnoreCaseAndEmailIgnoreCaseAndUtiliseFalse(
                        request.getNom(), request.getPrenom(), request.getEmail()
                );

        if (preRegOpt.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", 
                "Vous n'êtes pas encore pré-enregistré par le Directeur avec ces informations (Nom, Prénom, Email)."));
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.status(400).body(Map.of("message", "Cet email est déjà utilisé."));
        }

        // 2. Créer le compte utilisateur
        User formateur = User.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .motDePasse(passwordEncoder.encode(request.getMotDePasse()))
                .role(Role.FORMATEUR)
                .actif(true)
                .build();

        userRepository.save(formateur);

        // 3. Marquer le pré-enregistrement comme utilisé
        PreRegistration preReg = preRegOpt.get();
        preReg.setUtilise(true);
        preRegistrationRepository.save(preReg);

        return ResponseEntity.ok(Map.of("success", true, "message", "Inscription réussie. Vous pouvez vous connecter."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le refresh token est requis."));
        }
        try {
            String email = jwtTokenUtil.extractUsername(refreshToken);
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent() && jwtTokenUtil.validateToken(refreshToken, email)) {
                String newToken = jwtTokenUtil.generateToken(userOpt.get());
                return ResponseEntity.ok(Map.of("token", newToken));
            }
        } catch (Exception e) {
            // Ignoré
        }
        return ResponseEntity.status(401).body(Map.of("message", "Jeton de rafraîchissement invalide ou expiré."));
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String motDePasse;
    }

    @Data
    public static class InscriptionFormateurRequest {
        private String nom;
        private String prenom;
        private String email;
        private String motDePasse;
    }
}
