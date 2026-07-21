package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.service.EmailNotificationService;
import com.nehemiahlab.platform.service.InscriptionSettingsService;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.SecureFileStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/users")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.nehemiahlab.platform.repository.BanqueRepository banqueRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private InscriptionSettingsService inscriptionSettingsService;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @GetMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/formateurs")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'COMPTABLE', 'FORMATEUR')")
    public ResponseEntity<List<User>> getFormateurs() {
        return ResponseEntity.ok(userRepository.findByRoleOrderByCreatedAtDesc(Role.FORMATEUR));
    }

    @GetMapping("/formateurs/en-attente")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<User>> getFormateursEnAttente() {
        return ResponseEntity.ok(userRepository.findByRoleAndActifFalseOrderByCreatedAtDesc(Role.FORMATEUR));
    }

    @GetMapping("/coordinateurs")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<User>> getCoordinateurs() {
        return ResponseEntity.ok(userRepository.findByRole(Role.COORDINATEUR));
    }

    @GetMapping("/clusters")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<String>> getClusters() {
        return ResponseEntity.ok(centreRepository.findDistinctClusters());
    }

    @GetMapping("/inscriptions-formateurs/statut")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> getInscriptionsStatut() {
        boolean ouverte = inscriptionSettingsService.isInscriptionFormateursOuverte();
        return ResponseEntity.ok(Map.of("ouverte", ouverte));
    }

    @PutMapping("/inscriptions-formateurs/statut")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> setInscriptionsStatut(@RequestBody Map<String, Object> body) {
        boolean ouverte = Boolean.parseBoolean(String.valueOf(body.getOrDefault("ouverte", false)));
        inscriptionSettingsService.setInscriptionFormateursOuverte(ouverte);
        return ResponseEntity.ok(Map.of(
                "ouverte", ouverte,
                "message", ouverte
                        ? "Les inscriptions formateurs sont ouvertes."
                        : "Les inscriptions formateurs sont fermées."
        ));
    }

    @PutMapping("/{id}/valider-formateur")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> validerFormateur(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (user.getRole() != Role.FORMATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cet utilisateur n'est pas un formateur."));
        }
        user.setActif(true);
        userRepository.save(user);
        boolean emailEnvoye = emailNotificationService.sendFormateurCompteValide(
                user.getEmail(), user.getPrenom(), user.getNom());
        return ResponseEntity.ok(Map.of(
                "message", emailEnvoye
                        ? "Formateur validé. Un email a été envoyé à " + user.getEmail() + " (vérifiez aussi les spams)."
                        : "Formateur validé mais l'email n'a pas pu être envoyé. Informez le formateur qu'il peut se connecter.",
                "emailEnvoye", emailEnvoye,
                "user", user
        ));
    }

    @PostMapping("/creer-compte")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> creerCompte(@RequestBody Map<String, Object> body) {
        String nom = body.get("nom").toString();
        String prenom = body.get("prenom").toString();
        String email = body.get("email").toString();
        String roleStr = body.get("role").toString();
        String motDePassePropose = body.get("motDePasse") != null ? body.get("motDePasse").toString().trim() : "";
        String telephone = body.get("telephone") != null ? body.get("telephone").toString() : null;
        String lieuNaissance = body.get("lieuNaissance") != null ? body.get("lieuNaissance").toString() : null;
        String adresse = body.get("adresse") != null ? body.get("adresse").toString() : null;
        LocalDate dateNaissance = null;
        if (body.get("dateNaissance") != null && !body.get("dateNaissance").toString().isBlank()) {
            try {
                dateNaissance = LocalDate.parse(body.get("dateNaissance").toString());
                if (dateNaissance.isAfter(LocalDate.now())) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "La date de naissance ne peut pas dépasser aujourd'hui."));
                }
            } catch (Exception ignored) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Date de naissance invalide."));
            }
        }

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cet email est déjà utilisé."));
        }

        Role role = Role.valueOf(roleStr);
        if (role == Role.FORMATEUR || role == Role.PARENT) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message",
                    role == Role.PARENT
                            ? "Les parents se connectent avec le matricule de l'enfant (Espace parent). Aucun compte à créer ici."
                            : "Les formateurs s'inscrivent eux-mêmes ; validez-les depuis la page Formateurs."
            ));
        }

        String motDePasseInitial = motDePassePropose.isEmpty() ? "password123" : motDePassePropose;

        User user = User.builder()
                .nom(nom)
                .prenom(prenom)
                .email(email)
                .motDePasse(passwordEncoder.encode(motDePasseInitial))
                .role(role)
                .telephone(telephone)
                .lieuNaissance(lieuNaissance)
                .adresse(adresse)
                .dateNaissance(dateNaissance)
                .actif(true)
                .build();

        userRepository.save(user);

        if (role == Role.COORDINATEUR) {
            if (!body.containsKey("centreId") || body.get("centreId") == null || body.get("centreId").toString().isBlank()) {
                userRepository.delete(user);
                return ResponseEntity.badRequest().body(Map.of("message", "Le centre est obligatoire pour un coordinateur."));
            }
            Long centreId = Long.valueOf(body.get("centreId").toString());
            Optional<Centre> centreOpt = centreRepository.findById(centreId);
            if (centreOpt.isEmpty()) {
                userRepository.delete(user);
                return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
            }
            Centre centre = centreOpt.get();
            if (centre.getCoordinateur() != null) {
                userRepository.delete(user);
                return ResponseEntity.badRequest().body(Map.of("message", "Ce centre a déjà un coordinateur."));
            }
            List<Centre> existing = centreRepository.findByCoordinateur(user);
            if (!existing.isEmpty()) {
                userRepository.delete(user);
                return ResponseEntity.badRequest().body(Map.of("message", "Un coordinateur ne peut gérer qu'un seul centre."));
            }
            centre.setCoordinateur(user);
            centreRepository.save(centre);
        }

        if (role == Role.RESPONSABLE_CLUSTER) {
            String cluster = body.get("cluster") != null ? body.get("cluster").toString().trim() : "";
            if (cluster.isBlank()) {
                userRepository.delete(user);
                return ResponseEntity.badRequest().body(Map.of("message", "Le cluster est obligatoire pour un responsable de cluster."));
            }
            if (centreRepository.findByCluster(cluster).isEmpty()) {
                userRepository.delete(user);
                return ResponseEntity.badRequest().body(Map.of("message", "Cluster inconnu. Créez d'abord des centres dans ce cluster."));
            }
            user.setAssignedCluster(cluster);
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of(
                "message", "Compte créé avec succès.",
                "motDePasseInitial", motDePasseInitial,
                "motDePasseTemporaire", motDePassePropose.isEmpty()
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User current = (User) auth.getPrincipal();
        if (!current.getId().equals(id) && current.getRole() != Role.DIRECTEUR) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous ne pouvez modifier que votre propre profil."));
        }

        User user = userOpt.get();
        if (body.containsKey("nom")) user.setNom(InputSanitizer.clean(body.get("nom")));
        if (body.containsKey("prenom")) user.setPrenom(InputSanitizer.clean(body.get("prenom")));
        if (body.containsKey("telephone")) user.setTelephone(InputSanitizer.digitsOnly(body.get("telephone"), 15));
        if (body.containsKey("telephoneSecondaire")) user.setTelephoneSecondaire(InputSanitizer.digitsOnly(body.get("telephoneSecondaire"), 15));
        if (body.containsKey("numeroCompteBancaire")) user.setNumeroCompteBancaire(InputSanitizer.digitsOnly(body.get("numeroCompteBancaire"), 34));
        if (body.containsKey("numeroMobileMoney")) user.setNumeroMobileMoney(InputSanitizer.digitsOnly(body.get("numeroMobileMoney"), 15));
        if (body.containsKey("operateurMobileMoney")) {
            String op = body.get("operateurMobileMoney") == null ? "" : body.get("operateurMobileMoney").trim();
            if (!op.isEmpty() && !op.equals("MIXX_BY_YAS") && !op.equals("MOOV_MONEY")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Opérateur Mobile Money invalide (Mixx by Yas ou Moov Money)."));
            }
            user.setOperateurMobileMoney(op.isEmpty() ? null : op);
        }
        if (body.containsKey("banqueNom")) {
            String bn = InputSanitizer.clean(body.get("banqueNom")).trim();
            if (!bn.isEmpty() && !banqueRepository.existsByNomIgnoreCase(bn)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Cette banque n'est pas disponible. Le comptable doit d'abord l'ajouter."));
            }
            user.setBanqueNom(bn.isEmpty() ? null : bn);
        }
        if (body.containsKey("rib")) user.setRib(InputSanitizer.clean(body.get("rib")).replaceAll("[^A-Za-z0-9 ]", "").trim());
        if (body.containsKey("codeAgence")) user.setCodeAgence(InputSanitizer.clean(body.get("codeAgence")).replaceAll("[^A-Za-z0-9-]", "").trim());
        if (body.containsKey("intituleCompte")) user.setIntituleCompte(InputSanitizer.clean(body.get("intituleCompte")).trim());
        if (body.containsKey("tailleHabit")) {
            String taille = body.get("tailleHabit") == null ? "" : body.get("tailleHabit").trim().toUpperCase();
            List<String> taillesValides = List.of("XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL");
            if (!taille.isEmpty() && !taillesValides.contains(taille)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Taille d'habit invalide (XS a 4XL)."));
            }
            user.setTailleHabit(taille.isEmpty() ? null : taille);
        }
        if (body.containsKey("tailleCasquette")) {
            String taille = body.get("tailleCasquette") == null ? "" : body.get("tailleCasquette").trim().toUpperCase();
            List<String> taillesValides = List.of("S/M", "L/XL", "AJUSTABLE");
            if (!taille.isEmpty() && !taillesValides.contains(taille)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Taille de casquette invalide (S/M, L/XL ou Ajustable)."));
            }
            user.setTailleCasquette(taille.isEmpty() ? null : taille);
        }
        if (body.containsKey("lieuNaissance")) user.setLieuNaissance(InputSanitizer.clean(body.get("lieuNaissance")));
        if (body.containsKey("adresse")) user.setAdresse(InputSanitizer.clean(body.get("adresse")));
        if (body.containsKey("dateNaissance") && body.get("dateNaissance") != null && !body.get("dateNaissance").isEmpty()) {
            try {
                LocalDate dob = LocalDate.parse(body.get("dateNaissance"));
                if (dob.isAfter(LocalDate.now())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "La date de naissance ne peut pas être dans le futur."));
                }
                user.setDateNaissance(dob);
            } catch (Exception ignored) {
            }
        }
        if (body.containsKey("dateEntree")) {
            if (current.getRole() != Role.DIRECTEUR) {
                return ResponseEntity.status(403).body(Map.of("message", "Seul le Directeur peut modifier la date d'anciennete."));
            }
            String raw = body.get("dateEntree");
            if (raw == null || raw.isBlank()) {
                user.setDateEntree(null);
            } else {
                try {
                    LocalDate entree = LocalDate.parse(raw);
                    if (entree.isAfter(LocalDate.now())) {
                        return ResponseEntity.badRequest().body(Map.of("message", "La date d'anciennete ne peut pas être dans le futur."));
                    }
                    user.setDateEntree(entree);
                } catch (Exception ignored) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Date d'anciennete invalide."));
                }
            }
        }
        if (body.containsKey("motDePasse") && body.get("motDePasse") != null && !body.get("motDePasse").isEmpty()) {
            String ancien = body.get("ancienMotDePasse");
            if (ancien == null || ancien.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "L'ancien mot de passe est requis pour en définir un nouveau."));
            }
            if (!passwordEncoder.matches(ancien, user.getMotDePasse())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Ancien mot de passe incorrect."));
            }
            if (body.get("motDePasse").length() < 6 || body.get("motDePasse").length() > 128) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le nouveau mot de passe doit contenir entre 6 et 128 caractères."));
            }
            user.setMotDePasse(passwordEncoder.encode(body.get("motDePasse")));
        }

        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadMyAvatar(Authentication auth, @RequestParam("file") MultipartFile file) {
        User user = (User) auth.getPrincipal();
        try {
            String url = secureFileStorage.store(file, "avatars", "image", 5L * 1024 * 1024, "avatar-" + user.getId());
            User managed = userRepository.findById(user.getId()).orElse(user);
            managed.setAvatar(url);
            userRepository.save(managed);
            return ResponseEntity.ok(managed);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Echec upload avatar pour utilisateur {}", user.getId(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload de la photo."));
        }
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<?> deleteMyAvatar(Authentication auth) {
        User current = (User) auth.getPrincipal();
        Optional<User> userOpt = userRepository.findById(current.getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        user.setAvatar(null);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/me/carte-identite/{face}")
    public ResponseEntity<?> uploadCarteIdentite(
            Authentication auth,
            @PathVariable String face,
            @RequestParam("file") MultipartFile file
    ) {
        String side = face == null ? "" : face.trim().toLowerCase(Locale.ROOT);
        if (!side.equals("recto") && !side.equals("verso")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Indiquez recto ou verso."));
        }

        User current = (User) auth.getPrincipal();
        try {
            String url = secureFileStorage.store(
                    file, "identite", "image", 8L * 1024 * 1024, "cni-" + side + "-" + current.getId()
            );
            User managed = userRepository.findById(current.getId()).orElse(current);
            if (side.equals("recto")) {
                managed.setCarteIdentiteRecto(url);
            } else {
                managed.setCarteIdentiteVerso(url);
            }
            userRepository.save(managed);
            return ResponseEntity.ok(managed);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Echec upload carte d'identite ({}) pour utilisateur {}", side, current.getId(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Erreur lors de l'upload de la carte d'identité."
            ));
        }
    }

    @DeleteMapping("/me/carte-identite/{face}")
    public ResponseEntity<?> deleteCarteIdentite(Authentication auth, @PathVariable String face) {
        String side = face == null ? "" : face.trim().toLowerCase(Locale.ROOT);
        if (!side.equals("recto") && !side.equals("verso")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Indiquez recto ou verso."));
        }
        User current = (User) auth.getPrincipal();
        Optional<User> userOpt = userRepository.findById(current.getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (side.equals("recto")) {
            user.setCarteIdentiteRecto(null);
        } else {
            user.setCarteIdentiteVerso(null);
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> supprimerCompteEnAttente(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (user.getRole() == Role.DIRECTEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Impossible de supprimer un compte Directeur."));
        }
        if (user.isActif()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Seuls les comptes en attente (non validés) peuvent être supprimés définitivement."
            ));
        }

        List<Centre> centresLies = centreRepository.findByCoordinateur(user);
        if (!centresLies.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ce compte est lié à un centre en tant que coordinateur. Retirez ce lien avant de le supprimer."
            ));
        }

        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "Compte supprimé définitivement."));
    }
}
