package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.RoleLabels;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.CentreExcelService;
import com.nehemiahlab.platform.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/centres")
public class CentreController {

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CentreExcelService centreExcelService;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<Centre>> getAll(Authentication auth) {
        return ResponseEntity.ok(centreAccessService.accessibleCentres((User) auth.getPrincipal()));
    }

    @GetMapping("/mes-centres")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<Centre>> getMesCentres(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(centreAccessService.accessibleCentres(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<Centre> getById(@PathVariable Long id, Authentication auth) {
        centreAccessService.requireCentreAccess((User) auth.getPrincipal(), id);
        return centreRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> create(@RequestBody Centre centre) {
        centre.setTelephoneResponsable(cleanPhone(centre.getTelephoneResponsable()));
        centre.setTelephoneCoordinateur(cleanPhone(centre.getTelephoneCoordinateur()));
        centre.setTelephoneFormateur(cleanPhone(centre.getTelephoneFormateur()));
        if (centre.getCoordinateurNom() != null) {
            centre.setCoordinateurNom(centre.getCoordinateurNom().trim());
        }
        if (centre.getCoordinateurPrenom() != null) {
            centre.setCoordinateurPrenom(centre.getCoordinateurPrenom().trim());
        }
        centre.setEmails(cleanList(centre.getEmails()));
        centre.setTelephones(cleanPhoneList(centre.getTelephones()));

        CoordinateurResolution resolution = resolveCoordinateur(centre.getCoordinateurEmail(), null, centre);
        if (resolution.error != null) {
            return resolution.error;
        }
        if (resolution.coordinateurUser != null) {
            centre.setCoordinateur(resolution.coordinateurUser);
        }

        Centre saved = centreRepository.save(centre);
        return ResponseEntity.ok(buildCentreResponse(saved, resolution));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Centre updateData) {
        Optional<Centre> centreOpt = centreRepository.findById(id);
        if (centreOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Centre centre = centreOpt.get();
        centre.setNom(updateData.getNom());
        centre.setAdresse(updateData.getAdresse());
        centre.setVille(updateData.getVille());
        centre.setRegion(updateData.getRegion());
        centre.setCluster(updateData.getCluster());
        centre.setLatitude(updateData.getLatitude());
        centre.setLongitude(updateData.getLongitude());
        if (updateData.getCodeCdej() != null) {
            centre.setCodeCdej(updateData.getCodeCdej().isBlank() ? null : updateData.getCodeCdej().trim());
        }
        if (updateData.getTelephoneResponsable() != null) {
            centre.setTelephoneResponsable(cleanPhone(updateData.getTelephoneResponsable()));
        }
        if (updateData.getTelephoneCoordinateur() != null) {
            centre.setTelephoneCoordinateur(cleanPhone(updateData.getTelephoneCoordinateur()));
        }
        if (updateData.getTelephoneFormateur() != null) {
            centre.setTelephoneFormateur(cleanPhone(updateData.getTelephoneFormateur()));
        }
        if (updateData.getCoordinateurNom() != null) {
            centre.setCoordinateurNom(updateData.getCoordinateurNom().trim());
        }
        if (updateData.getCoordinateurPrenom() != null) {
            centre.setCoordinateurPrenom(updateData.getCoordinateurPrenom().trim());
        }
        if (updateData.getEmails() != null) {
            centre.setEmails(cleanList(updateData.getEmails()));
        }
        if (updateData.getTelephones() != null) {
            centre.setTelephones(cleanPhoneList(updateData.getTelephones()));
        }

        // L'email coordinateur n'est jamais stocke sur le centre (voir Centre#coordinateurEmail) :
        // on ne tente de creer/relier un compte que si le Directeur en a saisi un sur CETTE requete.
        CoordinateurResolution resolution = resolveCoordinateur(updateData.getCoordinateurEmail(), id, centre);
        if (resolution.error != null) {
            return resolution.error;
        }
        if (resolution.coordinateurUser != null) {
            centre.setCoordinateur(resolution.coordinateurUser);
        }

        Centre saved = centreRepository.save(centre);
        return ResponseEntity.ok(buildCentreResponse(saved, resolution));
    }

    /** Resultat de la resolution d'un email coordinateur saisi a la creation/modification d'un centre. */
    private static class CoordinateurResolution {
        ResponseEntity<?> error;
        User coordinateurUser;
        Boolean compteCree;
        String motDePasseInitial;
    }

    /**
     * Si un email coordinateur est fourni, cree (ou relie) automatiquement le compte de connexion
     * correspondant, au lieu de se limiter a un simple contact texte : sans ca, le Directeur devait
     * toujours passer par un second ecran ("Gerer les comptes") pour donner au coordinateur un moyen
     * de se connecter, ce qui menait a des centres "orphelins" (coordinateur note en texte mais jamais
     * capable de se connecter). Utilise aussi bien a la creation qu'a la modification d'un centre.
     *
     * @param excludeCentreId lors d'une modification, l'id du centre en cours d'edition (pour ne pas se
     *                        signaler soi-meme comme "deja gere par un autre centre" si le coordinateur
     *                        est deja celui de ce centre) ; null a la creation.
     */
    private CoordinateurResolution resolveCoordinateur(String rawEmail, Long excludeCentreId, Centre centreEnCours) {
        CoordinateurResolution result = new CoordinateurResolution();
        if (rawEmail == null || rawEmail.isBlank()) {
            return result;
        }
        String email = rawEmail.trim().toLowerCase();
        if (!InputSanitizer.isSafeEmail(email)) {
            result.error = ResponseEntity.badRequest().body(Map.of(
                    "message", "Format d'email invalide pour le coordinateur."));
            return result;
        }
        // Deja le coordinateur de CE centre : rien a faire (evite un faux "gere deja un autre centre").
        if (centreEnCours != null && centreEnCours.getCoordinateur() != null
                && email.equalsIgnoreCase(centreEnCours.getCoordinateur().getEmail())) {
            result.coordinateurUser = centreEnCours.getCoordinateur();
            result.compteCree = false;
            return result;
        }
        Optional<User> existingOpt = userRepository.findByEmailIgnoreCase(email);
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (existing.getRole() != Role.COORDINATEUR) {
                result.error = ResponseEntity.badRequest().body(Map.of(
                        "message", "Un compte existe déjà avec cet email, mais ce n'est pas un compte coordinateur."));
                return result;
            }
            List<Centre> deja = centreRepository.findByCoordinateur(existing);
            boolean geresAilleurs = deja.stream()
                    .anyMatch(c -> excludeCentreId == null || !c.getId().equals(excludeCentreId));
            if (geresAilleurs) {
                result.error = ResponseEntity.badRequest().body(Map.of(
                        "message", "Ce coordinateur gère déjà le centre « " + deja.get(0).getNom() + " »."));
                return result;
            }
            result.coordinateurUser = existing;
            result.compteCree = false;
        } else {
            String motDePasse = capitalizeFirst(email);
            User coordinateurUser = User.builder()
                    .nom(centreEnCours.getCoordinateurNom() != null ? centreEnCours.getCoordinateurNom() : "")
                    .prenom(centreEnCours.getCoordinateurPrenom() != null ? centreEnCours.getCoordinateurPrenom() : "")
                    .email(email)
                    .motDePasse(passwordEncoder.encode(motDePasse))
                    .role(Role.COORDINATEUR)
                    .telephone(centreEnCours.getTelephoneCoordinateur())
                    .actif(true)
                    .build();
            userRepository.save(coordinateurUser);
            result.coordinateurUser = coordinateurUser;
            result.compteCree = true;
            result.motDePasseInitial = motDePasse;
            // Le coordinateur doit recevoir ses identifiants par email : sans ce compte
            // le Directeur devait les lui communiquer lui-meme un par un.
            emailNotificationService.sendCompteCredentials(
                    email, coordinateurUser.getPrenom(), coordinateurUser.getNom(),
                    RoleLabels.fr(Role.COORDINATEUR), motDePasse);
        }
        return result;
    }

    /**
     * Forme de reponse toujours la meme (objet avec une cle "centre"), qu'un coordinateur ait ete
     * cree/relie ou non, pour que le frontend n'ait pas a deviner si res.data EST le centre ou le
     * CONTIENT selon le cas.
     */
    private static Map<String, Object> buildCentreResponse(Centre saved, CoordinateurResolution resolution) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("centre", saved);
        if (resolution.compteCree != null) {
            body.put("coordinateurCompteCree", resolution.compteCree);
        }
        if (resolution.motDePasseInitial != null) {
            body.put("coordinateurMotDePasseInitial", resolution.motDePasseInitial);
        }
        return body;
    }

    /** "coordinateur@ex.com" -> "Coordinateur@ex.com" : utilise comme mot de passe
     * initial simple et memorisable pour un compte coordinateur cree automatiquement
     * a la creation/modification d'un centre (et par la reinitialisation groupee). */
    static String capitalizeFirst(String value) {
        if (value == null || value.isEmpty()) return value;
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private static String cleanPhone(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        return digits.isBlank() ? null : digits;
    }

    private static List<String> cleanList(List<String> raw) {
        if (raw == null) return new java.util.ArrayList<>();
        return raw.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim)
                .distinct()
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));
    }

    private static List<String> cleanPhoneList(List<String> raw) {
        if (raw == null) return new java.util.ArrayList<>();
        return raw.stream()
                .map(CentreController::cleanPhone)
                .filter(v -> v != null && !v.isBlank())
                .distinct()
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return centreRepository.findById(id)
                .map(centre -> {
                    centreRepository.delete(centre);
                    return ResponseEntity.ok(Map.of("message", "Centre supprimé."));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{centreId}/formateurs/{formateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> assignerFormateur(@PathVariable Long centreId, @PathVariable Long formateurId) {
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        Optional<User> userOpt = userRepository.findById(formateurId);

        if (centreOpt.isEmpty() || userOpt.isEmpty() || userOpt.get().getRole() != Role.FORMATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Données invalides."));
        }

        Centre centre = centreOpt.get();
        User formateur = userOpt.get();

        // Un centre = un seul formateur ; un formateur peut couvrir plusieurs centres
        boolean alreadyAssigned = centre.getFormateurs().stream()
                .anyMatch(f -> f.getId().equals(formateur.getId()));
        if (alreadyAssigned) {
            return ResponseEntity.ok(Map.of("message", "Ce formateur est déjà assigné à ce centre."));
        }
        if (!centre.getFormateurs().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ce centre a déjà un formateur. Retirez-le avant d'en assigner un autre."
            ));
        }

        centre.getFormateurs().add(formateur);
        if (formateur.getCentres() == null) {
            formateur.setCentres(new java.util.HashSet<>());
        }
        formateur.getCentres().add(centre);
        centreRepository.save(centre);
        userRepository.save(formateur);

        return ResponseEntity.ok(Map.of("message", "Formateur assigné avec succès."));
    }

    @DeleteMapping("/{centreId}/formateurs/{formateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> retirerFormateur(@PathVariable Long centreId, @PathVariable Long formateurId) {
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        Optional<User> userOpt = userRepository.findById(formateurId);

        if (centreOpt.isEmpty() || userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Données invalides."));
        }

        Centre centre = centreOpt.get();
        User formateur = userOpt.get();

        centre.getFormateurs().remove(formateur);
        if (formateur.getCentres() != null) {
            formateur.getCentres().removeIf(c -> c.getId().equals(centreId));
        }
        centreRepository.save(centre);
        userRepository.save(formateur);

        return ResponseEntity.ok(Map.of("message", "Formateur retiré du centre."));
    }

    @PutMapping("/{centreId}/coordinateur/{coordinateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> assignerCoordinateur(@PathVariable Long centreId, @PathVariable Long coordinateurId) {
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        Optional<User> userOpt = userRepository.findById(coordinateurId);

        if (centreOpt.isEmpty() || userOpt.isEmpty() || userOpt.get().getRole() != Role.COORDINATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Données invalides."));
        }

        Centre centre = centreOpt.get();
        User coordinateur = userOpt.get();
        List<Centre> existing = centreRepository.findByCoordinateur(coordinateur);
        if (existing.stream().anyMatch(c -> !c.getId().equals(centreId))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ce coordinateur est déjà affecté à un autre centre."
            ));
        }

        centre.setCoordinateur(coordinateur);
        centreRepository.save(centre);

        return ResponseEntity.ok(Map.of("message", "Coordinateur assigné avec succès."));
    }

    @PostMapping("/{id}/localisation-courante")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> updateLocalisationCourante(@PathVariable Long id, @RequestBody Map<String, Double> body, Authentication auth) {
        Optional<Centre> centreOpt = centreRepository.findById(id);
        if (centreOpt.isEmpty()) return ResponseEntity.notFound().build();
        User user = (User) auth.getPrincipal();
        Centre centre = centreOpt.get();
        centreAccessService.requireCentreAccess(user, id);

        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Latitude et longitude sont requises."));
        }
        centre.setLatitude(lat);
        centre.setLongitude(lng);
        return ResponseEntity.ok(centreRepository.save(centre));
    }

    /** Export Excel : centres + eleves + contacts (backup / reinitialisation). */
    @GetMapping("/export-excel")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<byte[]> exportExcel() {
        try {
            byte[] bytes = centreExcelService.exportWorkbook();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ska_centres_eleves.xlsx")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Import Excel : recree/maj centres, eleves, coordinateurs et numeros. */
    @PostMapping(value = "/import-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> importExcel(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(centreExcelService.importWorkbook(file));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Erreur lors de l'import Excel : " + e.getMessage()
            ));
        }
    }
}
