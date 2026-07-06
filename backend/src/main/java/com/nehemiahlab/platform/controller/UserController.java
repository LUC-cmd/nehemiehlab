package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.PreRegistration;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.PreRegistrationRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PreRegistrationRepository preRegistrationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/formateurs")
    public ResponseEntity<List<User>> getFormateurs() {
        return ResponseEntity.ok(userRepository.findByRole(Role.FORMATEUR));
    }

    @GetMapping("/coordinateurs")
    public ResponseEntity<List<User>> getCoordinateurs() {
        return ResponseEntity.ok(userRepository.findByRole(Role.COORDINATEUR));
    }

    @PostMapping("/pre-enregistrer-formateur")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> preEnregistrerFormateur(@RequestBody Map<String, String> body) {
        String nom = body.get("nom");
        String prenom = body.get("prenom");
        String email = body.get("email");
        String telephone = body.get("telephone");

        if (preRegistrationRepository.existsByEmail(email) || userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Un formateur avec cet email est déjà enregistré."));
        }

        PreRegistration preReg = PreRegistration.builder()
                .nom(nom)
                .prenom(prenom)
                .email(email)
                .telephone(telephone)
                .utilise(false)
                .build();

        preRegistrationRepository.save(preReg);
        return ResponseEntity.ok(Map.of("message", "Formateur pré-enregistré avec succès."));
    }

    @PostMapping("/creer-compte")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> creerCompte(@RequestBody Map<String, String> body) {
        String nom = body.get("nom");
        String prenom = body.get("prenom");
        String email = body.get("email");
        String roleStr = body.get("role");

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cet email est déjà utilisé."));
        }

        Role role = Role.valueOf(roleStr);
        if (role == Role.DIRECTEUR || role == Role.FORMATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rôle non autorisé pour ce formulaire."));
        }

        User user = User.builder()
                .nom(nom)
                .prenom(prenom)
                .email(email)
                .motDePasse(passwordEncoder.encode("password123")) // Par défaut, réinitialisable
                .role(role)
                .actif(true)
                .build();

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Compte créé avec succès. Mot de passe par défaut : password123"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (body.containsKey("nom")) user.setNom(body.get("nom"));
        if (body.containsKey("prenom")) user.setPrenom(body.get("prenom"));
        if (body.containsKey("telephone")) user.setTelephone(body.get("telephone"));
        if (body.containsKey("motDePasse") && body.get("motDePasse") != null && !body.get("motDePasse").isEmpty()) {
            user.setMotDePasse(passwordEncoder.encode(body.get("motDePasse")));
        }

        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}/desactiver")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> desactiver(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (user.getRole() == Role.DIRECTEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Impossible de désactiver le compte Directeur."));
        }

        user.setActif(false);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Compte désactivé."));
    }
}
