package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.PasswordPolicy;
import com.nehemiahlab.platform.security.SecureFileStorage;
import com.nehemiahlab.platform.service.EmailNotificationService;
import com.nehemiahlab.platform.service.InscriptionSettingsService;
import com.nehemiahlab.platform.service.MatriculeService;
import com.nehemiahlab.platform.service.ParentActivationService;
import com.nehemiahlab.platform.service.PasswordResetOtpService;
import com.nehemiahlab.platform.service.RefreshTokenService;
import lombok.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private InscriptionSettingsService inscriptionSettingsService;

    @Autowired
    private PasswordResetOtpService passwordResetOtpService;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private MatriculeService matriculeService;

    @Autowired
    private ParentActivationService parentActivationService;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @Value("${app.auth.disable-lockout:false}")
    private boolean disableLoginLockout;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String motDePasse = request.getMotDePasse() == null ? "" : request.getMotDePasse();

        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Veuillez saisir votre adresse email.", "field", "email"));
        }
        if (!InputSanitizer.isSafeEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format d'email invalide. Exemple : nom@gmail.com", "field", "email"));
        }
        if (motDePasse.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Veuillez saisir votre mot de passe.", "field", "motDePasse"));
        }
        if (motDePasse.length() > 128) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mot de passe invalide.", "field", "motDePasse"));
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);

        // Message générique : évite l'énumération de comptes.
        if (userOpt.isEmpty() || isLoginLocked(userOpt.get())) {
            return ResponseEntity.status(401).body(Map.of(
                    "message", "Email ou mot de passe incorrect.",
                    "field", "motDePasse"
            ));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(motDePasse, user.getMotDePasse())) {
            registerFailedLogin(user);
            return ResponseEntity.status(401).body(Map.of(
                    "message", "Email ou mot de passe incorrect.",
                    "field", "motDePasse"
            ));
        }

        if (!user.isActif()) {
            return ResponseEntity.status(403).body(Map.of(
                    "message",
                    "Votre compte est en attente de validation par le Directeur. Vous pourrez vous connecter après validation."
            ));
        }
        clearLoginFailures(user);

        RefreshTokenService.TokenPair tokens = refreshTokenService.issue(user);

        Map<String, Object> response = new HashMap<>();
        response.put("token", tokens.accessToken());
        response.put("refreshToken", tokens.refreshToken());
        response.put("user", user);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login-parent")
    public ResponseEntity<?> loginParent(@RequestBody ParentLoginRequest request) {
        String matricule = matriculeService.normalize(request.getMatricule());
        String motDePasse = request.getMotDePasse() == null ? "" : request.getMotDePasse();

        if (matricule.isBlank() || motDePasse.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Le matricule et le mot de passe sont obligatoires.",
                    "field", "matricule"
            ));
        }
        if (!matriculeService.isValidFormat(matricule)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Format invalide. Exemple : 26SKA0487",
                    "field", "matricule"
            ));
        }
        Optional<Eleve> eleveOpt = eleveRepository.findByMatriculeIgnoreCase(matricule);
        if (eleveOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                    "message", "Matricule ou mot de passe incorrect.",
                    "field", "motDePasse"
            ));
        }

        Eleve eleve = eleveOpt.get();
        Optional<User> parentOpt = userRepository.findByEmail(parentActivationService.parentEmail(eleve));
        if (parentOpt.isEmpty()
                || !parentOpt.get().isParentCredentialsActivated()
                || !parentOpt.get().isActif()
                || isLoginLocked(parentOpt.get())) {
            return ResponseEntity.status(401).body(Map.of(
                    "message", "Matricule ou mot de passe incorrect. Activez d'abord le compte avec le code remis par le centre.",
                    "field", "motDePasse"
            ));
        }
        User parent = parentOpt.get();
        if (!passwordEncoder.matches(motDePasse, parent.getMotDePasse())) {
            registerFailedLogin(parent);
            return ResponseEntity.status(401).body(Map.of(
                    "message", "Matricule ou mot de passe incorrect.",
                    "field", "motDePasse"
            ));
        }
        clearLoginFailures(parent);
        RefreshTokenService.TokenPair tokens = refreshTokenService.issue(parent);

        Map<String, Object> response = new HashMap<>();
        response.put("token", tokens.accessToken());
        response.put("refreshToken", tokens.refreshToken());
        response.put("user", parent);
        response.put("eleve", Map.of(
                "id", eleve.getId(),
                "nom", eleve.getNom(),
                "prenom", eleve.getPrenom(),
                "matricule", eleve.getMatricule(),
                "classe", eleve.getClasse(),
                "age", eleve.getAge(),
                "centre", eleve.getCentre() != null ? eleve.getCentre().getNom() : "",
                "totalHeures", eleve.getTotalHeures() != null ? eleve.getTotalHeures() : 0
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/parent/activate")
    public ResponseEntity<?> activateParent(@RequestBody ParentActivationRequest request) {
        if (!PasswordPolicy.isValid(request.getNouveauMotDePasse())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", PasswordPolicy.requirementMessage(),
                    "field", "nouveauMotDePasse"
            ));
        }

        ParentActivationService.ActivationOutcome outcome = parentActivationService.activate(
                request.getMatricule(),
                request.getCodeActivation(),
                request.getNouveauMotDePasse()
        );
        if (!outcome.success()) {
            int status = outcome.locked() ? 429 : 400;
            return ResponseEntity.status(status).body(Map.of(
                    "message", outcome.locked()
                            ? "Trop de tentatives. Réessayez dans 30 minutes ou demandez un nouveau code."
                            : "Code d'activation invalide ou expiré."
            ));
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Compte parent activé. Vous pouvez maintenant vous connecter avec votre matricule et votre mot de passe."
        ));
    }

    @PostMapping(value = "/inscription-formateur", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> inscriptionFormateur(
            @RequestParam("nom") String nom,
            @RequestParam("prenom") String prenom,
            @RequestParam("email") String emailParam,
            @RequestParam("telephone") String telephoneParam,
            @RequestParam("dateNaissance") String dateNaissanceParam,
            @RequestParam("lieuNaissance") String lieuNaissanceParam,
            @RequestParam("motDePasse") String motDePasseParam,
            @RequestParam(value = "carteIdentiteRecto", required = false) MultipartFile carteRecto,
            @RequestParam(value = "carteIdentiteVerso", required = false) MultipartFile carteVerso
    ) {
        if (!inscriptionSettingsService.isInscriptionFormateursOuverte()) {
            return ResponseEntity.status(403).body(Map.of(
                    "message",
                    "Les inscriptions formateurs sont actuellement fermées par le Directeur."
            ));
        }

        if (nom == null || nom.isBlank()
                || prenom == null || prenom.isBlank()
                || emailParam == null || emailParam.isBlank()
                || telephoneParam == null || telephoneParam.isBlank()
                || dateNaissanceParam == null || dateNaissanceParam.isBlank()
                || lieuNaissanceParam == null || lieuNaissanceParam.isBlank()
                || motDePasseParam == null || motDePasseParam.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    "Tous les champs sont obligatoires (identité, téléphone, date et lieu de naissance, mot de passe)."
            ));
        }

        String email = emailParam.trim().toLowerCase();
        if (!InputSanitizer.isSafeEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format d'email invalide."));
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(400).body(Map.of("message", "Cet email est déjà utilisé."));
        }

        String nomPropre = InputSanitizer.clean(nom);
        String prenomPropre = InputSanitizer.clean(prenom);
        // Empeche un meme formateur de s'inscrire deux fois (nom+prenom identiques, meme avec
        // un email different) : la comparaison est insensible a la casse pour couvrir les
        // variantes de saisie (ex. "KOFFI"/"Koffi").
        if (userRepository.existsByNomIgnoreCaseAndPrenomIgnoreCaseAndRole(nomPropre, prenomPropre, Role.FORMATEUR)) {
            return ResponseEntity.status(400).body(Map.of(
                    "message",
                    "Un compte formateur existe déjà avec ce nom et prénom. Si c'est une erreur, contactez le Directeur."
            ));
        }

        if (!PasswordPolicy.isValid(motDePasseParam)) {
            return ResponseEntity.badRequest().body(Map.of("message", PasswordPolicy.requirementMessage()));
        }

        String telephone = InputSanitizer.digitsOnly(telephoneParam, 15);
        if (telephone == null || telephone.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le numéro de téléphone est invalide."));
        }

        LocalDate dateNaissance;
        try {
            dateNaissance = LocalDate.parse(dateNaissanceParam.trim());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format de date invalide. Utilisez AAAA-MM-JJ."));
        }
        if (dateNaissance.isAfter(LocalDate.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "La date de naissance ne peut pas être dans le futur."));
        }
        if (dateNaissance.isAfter(LocalDate.now().minusYears(16))) {
            return ResponseEntity.badRequest().body(Map.of("message", "La date de naissance est invalide."));
        }

        String rectoUrl = null;
        String versoUrl = null;
        try {
            if (carteRecto != null && !carteRecto.isEmpty()) {
                rectoUrl = secureFileStorage.store(carteRecto, "identite", "image", 8L * 1024 * 1024, "cni-recto-inscription");
            }
            if (carteVerso != null && !carteVerso.isEmpty()) {
                versoUrl = secureFileStorage.store(carteVerso, "identite", "image", 8L * 1024 * 1024, "cni-verso-inscription");
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Erreur lors de l'enregistrement de la carte d'identité."
            ));
        }

        User formateur = User.builder()
                .nom(nomPropre)
                .prenom(prenomPropre)
                .email(email)
                .motDePasse(passwordEncoder.encode(motDePasseParam.trim()))
                .telephone(telephone)
                .dateNaissance(dateNaissance)
                .lieuNaissance(InputSanitizer.clean(lieuNaissanceParam))
                .carteIdentiteRecto(rectoUrl)
                .carteIdentiteVerso(versoUrl)
                .role(Role.FORMATEUR)
                .actif(false)
                .build();

        try {
            userRepository.save(formateur);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Filet de securite contre une condition de course (deux soumissions quasi
            // simultanees passant toutes les deux la verification existsByEmail ci-dessus
            // avant que l'une des deux ne soit enregistree) : la contrainte unique en base
            // sur l'email rejette l'insertion en double plutot que de la laisser passer.
            return ResponseEntity.status(400).body(Map.of("message", "Cet email est déjà utilisé."));
        }

        boolean emailEnvoye = emailNotificationService.sendFormateurInscriptionConfirmation(
                email, formateur.getPrenom(), formateur.getNom());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", emailEnvoye
                        ? "Inscription enregistrée. Un email de confirmation a été envoyé à " + email + ". Vérifiez aussi vos spams."
                        : "Inscription enregistrée. L'email de confirmation n'a pas pu être envoyé (service mail indisponible). Le Directeur validera votre compte.",
                "emailEnvoye", emailEnvoye
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le refresh token est requis."));
        }
        Optional<RefreshTokenService.TokenPair> rotated = refreshTokenService.rotate(refreshToken);
        if (rotated.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "token", rotated.get().accessToken(),
                    "refreshToken", rotated.get().refreshToken()
            ));
        }
        return ResponseEntity.status(401).body(Map.of("message", "Jeton de rafraîchissement invalide ou expiré."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> request) {
        if (request != null) {
            refreshTokenService.revoke(request.get("refreshToken"));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Étape 1 : envoie un code OTP à l'email du compte (Gmail SMTP).
     * Empêche de changer le mot de passe avec seulement les infos d'une carte d'identité.
     */
    @PostMapping("/password-reset/request-otp")
    public ResponseEntity<?> requestPasswordResetOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email") == null ? "" : body.get("email").trim().toLowerCase();
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'email est obligatoire."));
        }
        if (!InputSanitizer.isSafeEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format d'email invalide."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        // Réponse générique pour ne pas révéler si l'email existe
        String genericOk = "Si un compte actif existe pour cet email, un code a été envoyé. "
                + "Ouvrez Gmail → Courrier indésirable / Spam et recherchez « Smart Kids Academy ».";
        if (userOpt.isEmpty() || !userOpt.get().isActif()) {
            return ResponseEntity.ok(Map.of("success", true, "message", genericOk));
        }

        User user = userOpt.get();
        try {
            passwordResetOtpService.generateAndSend(email, user.getPrenom() + " " + user.getNom());
            return ResponseEntity.ok(Map.of("success", true, "message", genericOk));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "message",
                    "Impossible d'envoyer l'email OTP pour le moment. Réessayez plus tard."
            ));
        }
    }

    /**
     * Étape 2 : valide l'OTP reçu par email, puis change le mot de passe.
     */
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<?> confirmResetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getOtp() == null || request.getOtp().isBlank()
                || request.getNouveauMotDePasse() == null || request.getNouveauMotDePasse().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Email, code OTP et nouveau mot de passe sont obligatoires."
            ));
        }

        String email = request.getEmail().trim().toLowerCase();
        if (!InputSanitizer.isSafeEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format d'email invalide."));
        }
        if (!PasswordPolicy.isValid(request.getNouveauMotDePasse())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", PasswordPolicy.requirementMessage()
            ));
        }
        if (request.getOtp() == null || !request.getOtp().trim().matches("^\\d{4,8}$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code OTP invalide."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        // Message générique : ne pas révéler si le compte existe
        if (userOpt.isEmpty() || !passwordResetOtpService.validate(email, request.getOtp().trim())) {
            return ResponseEntity.status(400).body(Map.of(
                    "message", "Code OTP invalide ou expiré. Demandez un nouveau code."
            ));
        }

        User user = userOpt.get();
        user.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasse().trim()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter."
        ));
    }

    private boolean isLoginLocked(User user) {
        if (disableLoginLockout) return false;
        return user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
    }

    private void registerFailedLogin(User user) {
        if (disableLoginLockout) return;
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= 5) {
            long minutes = Math.min(60, 15L * (attempts - 4));
            user.setLockedUntil(LocalDateTime.now().plusMinutes(minutes));
        }
        userRepository.save(user);
    }

    private void clearLoginFailures(User user) {
        if (user.getFailedLoginAttempts() != 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String motDePasse;
    }

    @Data
    public static class ParentLoginRequest {
        private String matricule;
        private String motDePasse;
    }

    @Data
    public static class ParentActivationRequest {
        private String matricule;
        private String codeActivation;
        private String nouveauMotDePasse;
    }

    @Data
    public static class InscriptionFormateurRequest {
        private String nom;
        private String prenom;
        private String email;
        private String telephone;
        private String dateNaissance;
        private String lieuNaissance;
        private String motDePasse;
    }

    @Data
    public static class ResetPasswordRequest {
        private String email;
        private String otp;
        private String nouveauMotDePasse;
    }
}
