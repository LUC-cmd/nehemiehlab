package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.CommunityProfileRepository;
import com.nehemiahlab.platform.repository.EnfantProfileRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.EnfantProjectRepository;
import com.nehemiahlab.platform.repository.RessourceItemRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.SecureFileStorage;
import com.nehemiahlab.platform.service.CentreAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/content-management")
public class ContentManagementController {
    @Autowired
    private RessourceItemRepository ressourceItemRepository;

    @Autowired
    private CommunityProfileRepository communityProfileRepository;

    @Autowired
    private EnfantProfileRepository enfantProfileRepository;

    @Autowired
    private EnfantProjectRepository enfantProjectRepository;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private SecureFileStorage secureFileStorage;

    // ---------------------- Ressources (interne CDEJ) ----------------------
    /** Lecture : Directeur, staff Nehemiah, formateurs SKA, animateurs, coordinateurs */
    @GetMapping("/ressources")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'STAFF_NEHEMIAH', 'FORMATEUR', 'ANIMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<RessourceItem>> getRessourcesAdmin(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<RessourceItem> items = user.getRole() == Role.DIRECTEUR
                ? ressourceItemRepository.findAll()
                : ressourceItemRepository.findByActifTrueOrderByUpdatedAtDesc();
        return ResponseEntity.ok(items);
    }

    @PostMapping("/ressources")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<RessourceItem> createRessource(@RequestBody RessourceItem body) {
        return ResponseEntity.ok(ressourceItemRepository.save(body));
    }

    @PostMapping(value = "/ressources/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> createRessourceWithFile(
            @RequestParam("titre") String titre,
            @RequestParam("description") String description,
            @RequestParam("categorie") ResourceCategory categorie,
            @RequestParam(value = "lien", required = false) String lien,
            @RequestParam(value = "actif", defaultValue = "true") boolean actif,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) MultipartFile[] files
    ) {
        try {
            RessourceItem item = RessourceItem.builder()
                    .titre(titre)
                    .description(description)
                    .categorie(categorie)
                    .lien(lien != null && !lien.isBlank() ? lien.trim() : null)
                    .actif(actif)
                    .build();

            List<MultipartFile> allFiles = collectFiles(file, files);
            for (MultipartFile f : allFiles) {
                SavedFile saved = saveRessourceFile(f);
                item.addFichier(RessourceFichier.builder()
                        .url(saved.url())
                        .nom(saved.originalName())
                        .mimeType(f.getContentType())
                        .build());
            }
            RessourceItem persisted = ressourceItemRepository.save(item);
            return ResponseEntity.ok(persisted);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du document."));
        }
    }

    @PutMapping("/ressources/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> updateRessource(@PathVariable Long id, @RequestBody RessourceItem body) {
        Optional<RessourceItem> opt = ressourceItemRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        RessourceItem item = opt.get();
        item.setTitre(body.getTitre());
        item.setDescription(body.getDescription());
        item.setCategorie(body.getCategorie());
        item.setLien(body.getLien());
        item.setActif(body.isActif());
        return ResponseEntity.ok(ressourceItemRepository.save(item));
    }

    @PostMapping(value = "/ressources/{id}/fichier", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> uploadRessourceFichier(
            @PathVariable Long id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) MultipartFile[] files
    ) {
        Optional<RessourceItem> opt = ressourceItemRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        List<MultipartFile> allFiles = collectFiles(file, files);
        if (allFiles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fichier manquant."));
        }
        try {
            RessourceItem item = opt.get();
            item.ensureFichiersHydrated();
            // Persister d'abord les fichiers legacy migrés sans id
            if (item.getFichiers() != null) {
                for (RessourceFichier existing : item.getFichiers()) {
                    if (existing.getId() == null) {
                        existing.setRessource(item);
                    }
                }
            }
            for (MultipartFile f : allFiles) {
                SavedFile saved = saveRessourceFile(f);
                item.addFichier(RessourceFichier.builder()
                        .url(saved.url())
                        .nom(saved.originalName())
                        .mimeType(f.getContentType())
                        .build());
            }
            RessourceItem persisted = ressourceItemRepository.save(item);
            return ResponseEntity.ok(persisted);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du document."));
        }
    }

    @DeleteMapping("/ressources/{id}/fichiers/{fichierId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> deleteRessourceFichier(@PathVariable Long id, @PathVariable Long fichierId) {
        Optional<RessourceItem> opt = ressourceItemRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        RessourceItem item = opt.get();
        item.ensureFichiersHydrated();

        // fichierId == 0 : vider le mono-fichier legacy
        if (fichierId != null && fichierId == 0L) {
            item.getFichiers().clear();
            item.setFichierUrl(null);
            item.setFichierNom(null);
            return ResponseEntity.ok(ressourceItemRepository.save(item));
        }

        RessourceFichier target = item.getFichiers().stream()
                .filter(f -> fichierId.equals(f.getId()))
                .findFirst()
                .orElse(null);
        if (target == null) {
            if (item.getFichierUrl() != null && item.getFichiers().size() <= 1) {
                item.setFichierUrl(null);
                item.setFichierNom(null);
                item.getFichiers().clear();
                return ResponseEntity.ok(ressourceItemRepository.save(item));
            }
            return ResponseEntity.notFound().build();
        }
        item.removeFichier(target);
        return ResponseEntity.ok(ressourceItemRepository.save(item));
    }

    @DeleteMapping("/ressources/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> deleteRessource(@PathVariable Long id) {
        if (!ressourceItemRepository.existsById(id)) return ResponseEntity.notFound().build();
        ressourceItemRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Ressource supprimée."));
    }

    private List<MultipartFile> collectFiles(MultipartFile single, MultipartFile[] many) {
        List<MultipartFile> all = new java.util.ArrayList<>();
        if (single != null && !single.isEmpty()) all.add(single);
        if (many != null) {
            for (MultipartFile f : many) {
                if (f != null && !f.isEmpty()) all.add(f);
            }
        }
        return all;
    }

    private record SavedFile(String url, String originalName) {}

    private SavedFile saveRessourceFile(MultipartFile file) throws Exception {
        if (file.getSize() > 100L * 1024 * 1024) {
            throw new IllegalArgumentException("Chaque fichier ne doit pas dépasser 100 Mo.");
        }
        String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')).toLowerCase() : "";
        Path uploadDir = Paths.get("uploads", "ressources");
        if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
        String filename = "ressource-" + UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return new SavedFile("/uploads/ressources/" + filename, original);
    }

    // ---------------------- Communaute (interne CDEJ) ----------------------
    /** Lecture : cercle CDEJ (pas les parents — ils ont uniquement le suivi enfant) */
    @GetMapping("/communaute")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT')")
    public ResponseEntity<List<CommunityProfile>> getCommunauteAdmin(Authentication auth) {
        User user = (User) auth.getPrincipal();
        if (user.getRole() == Role.DIRECTEUR) {
            return ResponseEntity.ok(communityProfileRepository.findAll());
        }
        return ResponseEntity.ok(communityProfileRepository.findByActifTrueOrderByUpdatedAtDesc());
    }

    @PostMapping("/communaute")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> createCommunaute(@RequestBody CommunityProfile body) {
        Optional<String> validationError = validateCommunityProfile(body, true);
        if (validationError.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", validationError.get()));
        }
        CommunityProfile profile = CommunityProfile.builder()
                .actif(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        applyCommunityFields(profile, body, true);
        return ResponseEntity.ok(communityProfileRepository.save(profile));
    }

    @PutMapping("/communaute/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> updateCommunaute(@PathVariable Long id, @RequestBody CommunityProfile body) {
        Optional<CommunityProfile> opt = communityProfileRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Optional<String> validationError = validateCommunityProfile(body, true);
        if (validationError.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", validationError.get()));
        }
        CommunityProfile profile = opt.get();
        applyCommunityFields(profile, body, true);
        return ResponseEntity.ok(communityProfileRepository.save(profile));
    }

    @DeleteMapping("/communaute/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> deleteCommunaute(@PathVariable Long id) {
        if (!communityProfileRepository.existsById(id)) return ResponseEntity.notFound().build();
        communityProfileRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Profil supprimé."));
    }

    @PostMapping("/communaute/{id}/photo")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> uploadCommunityPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Optional<CommunityProfile> opt = communityProfileRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        try {
            Path uploadDir = Paths.get("uploads", "community");
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            String original = file.getOriginalFilename() == null ? "file.jpg" : file.getOriginalFilename();
            String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : ".jpg";
            String filename = "community-" + id + "-" + UUID.randomUUID() + ext;
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            CommunityProfile profile = opt.get();
            profile.setPhotoUrl("/uploads/community/" + filename);
            communityProfileRepository.save(profile);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur upload photo."));
        }
    }

    private static final String COMMUNITY_ROLES =
            "hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR', 'BENEVOLE', 'PARTICIPANT')";

    @GetMapping("/communaute/me")
    @PreAuthorize(COMMUNITY_ROLES)
    public ResponseEntity<?> getMyCommunityProfile(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(communityProfileRepository.findByUserId(user.getId()).orElse(null));
    }

    @PutMapping("/communaute/me")
    @PreAuthorize(COMMUNITY_ROLES)
    public ResponseEntity<?> upsertMyCommunityProfile(Authentication auth, @RequestBody CommunityProfile body) {
        User user = (User) auth.getPrincipal();
        body.setType(user.getRole() == Role.FORMATEUR
                ? CommunityProfileType.SKA_TEACHER
                : CommunityProfileType.AUTRE_PARTICIPANT);
        Optional<String> validationError = validateCommunityProfile(body, true);
        if (validationError.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", validationError.get()));
        }
        CommunityProfile profile = communityProfileRepository.findByUserId(user.getId()).orElseGet(() ->
                CommunityProfile.builder()
                        .userId(user.getId())
                        .nomComplet(user.getPrenom() + " " + user.getNom())
                        .type(user.getRole() == Role.FORMATEUR ? CommunityProfileType.SKA_TEACHER : CommunityProfileType.AUTRE_PARTICIPANT)
                        .roleAffiche(defaultRoleLabel(user.getRole()))
                        .actif(true)
                        .build()
        );

        profile.setType(user.getRole() == Role.FORMATEUR
                ? CommunityProfileType.SKA_TEACHER
                : CommunityProfileType.AUTRE_PARTICIPANT);
        profile.setRoleAffiche(defaultRoleLabel(user.getRole()));
        applyCommunityFields(profile, body, false);
        profile.setActif(true);
        profile.setUserId(user.getId());
        return ResponseEntity.ok(communityProfileRepository.save(profile));
    }

    @PostMapping("/communaute/me/photo")
    @PreAuthorize(COMMUNITY_ROLES)
    public ResponseEntity<?> uploadMyCommunityPhoto(Authentication auth, @RequestParam("file") MultipartFile file) {
        User user = (User) auth.getPrincipal();
        CommunityProfile profile = communityProfileRepository.findByUserId(user.getId()).orElseGet(() ->
                CommunityProfile.builder()
                        .userId(user.getId())
                        .nomComplet(user.getPrenom() + " " + user.getNom())
                        .type(user.getRole() == Role.FORMATEUR ? CommunityProfileType.SKA_TEACHER : CommunityProfileType.AUTRE_PARTICIPANT)
                        .roleAffiche(defaultRoleLabel(user.getRole()))
                        .actif(true)
                        .build()
        );
        try {
            Path uploadDir = Paths.get("uploads", "community");
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            String original = file.getOriginalFilename() == null ? "file.jpg" : file.getOriginalFilename();
            String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : ".jpg";
            String filename = "community-me-" + user.getId() + "-" + UUID.randomUUID() + ext;
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            profile.setPhotoUrl("/uploads/community/" + filename);
            profile.setUserId(user.getId());
            return ResponseEntity.ok(communityProfileRepository.save(profile));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur upload photo."));
        }
    }

    // ---------------------- Profils enfants ----------------------
    @GetMapping("/enfants")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<EnfantProfile>> getEnfantsAdmin(Authentication auth) {
        return ResponseEntity.ok(centreAccessService.accessibleEnfants((User) auth.getPrincipal()));
    }

    @PostMapping("/enfants")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> createEnfant(@RequestBody EnfantProfile body, Authentication auth) {
        User user = (User) auth.getPrincipal();
        if (body.getCentreId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le centre est obligatoire."));
        }
        centreAccessService.requireCentreAccess(user, body.getCentreId());

        if (body.getEleveId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Sélectionnez un enfant inscrit dans le centre."));
        }

        Optional<Eleve> eleveOpt = eleveRepository.findById(body.getEleveId());
        if (eleveOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Élève introuvable."));
        }
        Eleve eleve = eleveOpt.get();
        centreAccessService.requireEleveAccess(user, eleve.getId());
        if (eleve.getCentre() == null || !body.getCentreId().equals(eleve.getCentre().getId())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "L'élève sélectionné n'appartient pas à ce centre."));
        }
        if (enfantProfileRepository.findByEleveId(eleve.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Un profil existe déjà pour cet enfant."));
        }

        EnfantProfile profile = EnfantProfile.builder()
                .nom(eleve.getNom())
                .prenom(eleve.getPrenom())
                .age(eleve.getAge())
                .centre(eleve.getCentre().getNom())
                .centreId(eleve.getCentre().getId())
                .region(body.getRegion())
                .cluster(body.getCluster())
                .presentation(body.getPresentation())
                .pointsForts(body.getPointsForts())
                .photoUrl(body.getPhotoUrl())
                .eleveId(eleve.getId())
                .createdByUserId(user.getId())
                .actif(body.isActif())
                .build();

        if (profile.getRegion() == null || profile.getRegion().isBlank()) {
            profile.setRegion(eleve.getCentre().getRegion());
        }
        if (profile.getCluster() == null || profile.getCluster().isBlank()) {
            profile.setCluster(eleve.getCentre().getCluster());
        }

        return ResponseEntity.ok(enfantProfileRepository.save(profile));
    }

    @PutMapping("/enfants/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> updateEnfant(
            @PathVariable Long id,
            @RequestBody EnfantProfile body,
            Authentication auth
    ) {
        Optional<EnfantProfile> opt = enfantProfileRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        EnfantProfile enfant = opt.get();
        User user = (User) auth.getPrincipal();
        centreAccessService.requireEnfantAccess(user, enfant);
        if (body.getCentreId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le centre est obligatoire."));
        }
        centreAccessService.requireCentreAccess(user, body.getCentreId());
        enfant.setNom(body.getNom());
        enfant.setPrenom(body.getPrenom());
        enfant.setAge(body.getAge());
        enfant.setCentre(body.getCentre());
        enfant.setCentreId(body.getCentreId());
        enfant.setRegion(body.getRegion());
        enfant.setCluster(body.getCluster());
        enfant.setPresentation(body.getPresentation());
        enfant.setPointsForts(body.getPointsForts());
        if (body.getPhotoUrl() != null) enfant.setPhotoUrl(body.getPhotoUrl());
        if (body.getEleveId() != null) enfant.setEleveId(body.getEleveId());
        enfant.setActif(body.isActif());
        return ResponseEntity.ok(enfantProfileRepository.save(enfant));
    }

    @DeleteMapping("/enfants/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> deleteEnfant(@PathVariable Long id, Authentication auth) {
        Optional<EnfantProfile> enfant = enfantProfileRepository.findById(id);
        if (enfant.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEnfantAccess((User) auth.getPrincipal(), enfant.get());
        enfantProfileRepository.delete(enfant.get());
        return ResponseEntity.ok(Map.of("message", "Profil enfant supprimé."));
    }

    @PostMapping("/enfants/{id}/photo")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> uploadEnfantPhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        Optional<EnfantProfile> opt = enfantProfileRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEnfantAccess((User) auth.getPrincipal(), opt.get());
        try {
            EnfantProfile enfant = opt.get();
            enfant.setPhotoUrl(secureFileStorage.store(
                    file, "enfants", "image", 8L * 1024 * 1024, "enfant-" + id));
            return ResponseEntity.ok(enfantProfileRepository.save(enfant));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur upload photo."));
        }
    }

    @PostMapping("/enfants/{enfantId}/projets")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> addProjet(
            @PathVariable Long enfantId,
            @RequestBody EnfantProject body,
            Authentication auth
    ) {
        Optional<EnfantProfile> enfantOpt = enfantProfileRepository.findById(enfantId);
        if (enfantOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Profil enfant introuvable."));
        centreAccessService.requireEnfantAccess((User) auth.getPrincipal(), enfantOpt.get());
        EnfantProject project = EnfantProject.builder()
                .enfant(enfantOpt.get())
                .titre(body.getTitre())
                .description(body.getDescription())
                .mediaType(body.getMediaType())
                .mediaUrl(body.getMediaUrl())
                .actif(body.isActif())
                .build();
        return ResponseEntity.ok(enfantProjectRepository.save(project));
    }

    @PutMapping("/projets-enfants/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> updateProjet(
            @PathVariable Long id,
            @RequestBody EnfantProject body,
            Authentication auth
    ) {
        Optional<EnfantProject> opt = enfantProjectRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        EnfantProject project = opt.get();
        centreAccessService.requireEnfantAccess((User) auth.getPrincipal(), project.getEnfant());
        project.setTitre(body.getTitre());
        project.setDescription(body.getDescription());
        project.setMediaType(body.getMediaType());
        project.setMediaUrl(body.getMediaUrl());
        project.setActif(body.isActif());
        return ResponseEntity.ok(enfantProjectRepository.save(project));
    }

    @PostMapping("/projets-enfants/{id}/media")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> uploadProjetMedia(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        Optional<EnfantProject> opt = enfantProjectRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEnfantAccess((User) auth.getPrincipal(), opt.get().getEnfant());
        try {
            EnfantProject project = opt.get();
            String storedUrl = secureFileStorage.store(
                    file, "projets-enfants", "media", 100L * 1024 * 1024, "projet-" + id);
            String ext = storedUrl.substring(storedUrl.lastIndexOf('.')).toLowerCase();
            project.setMediaUrl(storedUrl);
            if (ext.equals(".sb3")) project.setMediaType(ProjectMediaType.SCRATCH);
            else if (ext.equals(".mp4") || ext.equals(".webm") || ext.equals(".mov")) project.setMediaType(ProjectMediaType.VIDEO);
            else if (ext.equals(".png") || ext.equals(".jpg") || ext.equals(".jpeg") || ext.equals(".gif") || ext.equals(".webp")) project.setMediaType(ProjectMediaType.IMAGE);
            else project.setMediaType(ProjectMediaType.LIEN);
            return ResponseEntity.ok(enfantProjectRepository.save(project));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur upload media."));
        }
    }

    @DeleteMapping("/projets-enfants/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> deleteProjet(@PathVariable Long id, Authentication auth) {
        Optional<EnfantProject> project = enfantProjectRepository.findById(id);
        if (project.isEmpty()) return ResponseEntity.notFound().build();
        centreAccessService.requireEnfantAccess((User) auth.getPrincipal(), project.get().getEnfant());
        enfantProjectRepository.delete(project.get());
        return ResponseEntity.ok(Map.of("message", "Projet supprimé."));
    }

    private static String defaultRoleLabel(Role role) {
        return switch (role) {
            case DIRECTEUR -> "Directeur";
            case FORMATEUR -> "Formateur SKA";
            case COORDINATEUR -> "Coordinateur";
            case RESPONSABLE_CLUSTER -> "Responsable cluster";
            case COMPTABLE -> "Comptable";
            case STAFF_NEHEMIAH -> "Staff Nehemiah";
            case ANIMATEUR -> "Animateur CDEJ";
            case PARENT -> "Parent";
            case BENEVOLE -> "Bénévole CDEJ";
            case PARTICIPANT -> "Participant CDEJ";
        };
    }

    private static Optional<String> validateCommunityProfile(CommunityProfile body, boolean requirePhone) {
        String nom = InputSanitizer.clean(body.getNomComplet());
        if (nom == null || nom.length() < 2) {
            return Optional.of("Le nom complet est obligatoire (2 caractères minimum).");
        }
        if (requirePhone) {
            String phone = InputSanitizer.digitsOnly(body.getContacts(), 20);
            if (phone == null || phone.length() < 8) {
                return Optional.of("Un numéro de téléphone valide est obligatoire.");
            }
        }
        if (body.getType() == null) {
            return Optional.of("Le type de profil est obligatoire.");
        }
        return Optional.empty();
    }

    private static void applyCommunityFields(CommunityProfile target, CommunityProfile body, boolean directorEdit) {
        String nom = InputSanitizer.clean(body.getNomComplet());
        if (nom != null && nom.length() >= 2) {
            target.setNomComplet(nom.length() > 180 ? nom.substring(0, 180) : nom);
        }

        if (directorEdit && body.getType() != null) {
            target.setType(body.getType());
        }

        String roleAffiche = InputSanitizer.cleanNullable(body.getRoleAffiche());
        if (roleAffiche != null) {
            target.setRoleAffiche(roleAffiche.length() > 120 ? roleAffiche.substring(0, 120) : roleAffiche);
        } else if (directorEdit && (target.getRoleAffiche() == null || target.getRoleAffiche().isBlank())) {
            target.setRoleAffiche(target.getType() == CommunityProfileType.SKA_TEACHER
                    ? "Formateur SKA"
                    : "Membre CDEJ");
        }

        target.setBio(truncateText(InputSanitizer.cleanNullable(body.getBio()), 2000));
        target.setCompetences(truncateText(InputSanitizer.cleanNullable(body.getCompetences()), 500));

        String phone = InputSanitizer.digitsOnly(body.getContacts(), 20);
        if (phone != null) {
            target.setContacts(phone);
        }

        if (target.getType() == CommunityProfileType.SKA_TEACHER) {
            int enfants = body.getEnfantsAccompagnes() == null ? 0 : body.getEnfantsAccompagnes();
            target.setEnfantsAccompagnes(Math.max(0, Math.min(9999, enfants)));
        } else {
            target.setEnfantsAccompagnes(0);
        }

        if (directorEdit) {
            target.setActif(body.isActif());
        }
    }

    private static String truncateText(String value, int maxLen) {
        if (value == null) return null;
        return value.length() > maxLen ? value.substring(0, maxLen) : value;
    }
}
