package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.GaleriePhoto;
import com.nehemiahlab.platform.repository.GaleriePhotoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/galerie")
public class GalerieController {

    private static final Set<String> ALLOWED_EXT = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");
    private static final long MAX_BYTES = 10L * 1024 * 1024;

    @Autowired
    private GaleriePhotoRepository galeriePhotoRepository;

    @GetMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<GaleriePhoto>> getAll() {
        return ResponseEntity.ok(galeriePhotoRepository.findAllByOrderByOrdreAscCreatedAtDesc());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> create(@RequestBody GaleriePhoto body) {
        if (body.getLegende() == null || body.getLegende().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "La légende est obligatoire."));
        }
        GaleriePhoto photo = GaleriePhoto.builder()
                .legende(body.getLegende().trim())
                .imageUrl(body.getImageUrl())
                .ordre(body.getOrdre())
                .actif(body.isActif())
                .build();
        return ResponseEntity.ok(galeriePhotoRepository.save(photo));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody GaleriePhoto body) {
        return galeriePhotoRepository.findById(id)
                .map(photo -> {
                    if (body.getLegende() != null && !body.getLegende().isBlank()) {
                        photo.setLegende(body.getLegende().trim());
                    }
                    photo.setOrdre(body.getOrdre());
                    photo.setActif(body.isActif());
                    if (body.getImageUrl() != null) {
                        photo.setImageUrl(body.getImageUrl());
                    }
                    return ResponseEntity.ok(galeriePhotoRepository.save(photo));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!galeriePhotoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        galeriePhotoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Photo supprimée de la galerie."));
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        GaleriePhoto photo = galeriePhotoRepository.findById(id).orElse(null);
        if (photo == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            validateImage(file);
            Path uploadDir = Paths.get("uploads", "galerie");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String ext = extension(file.getOriginalFilename());
            String filename = "galerie-" + id + "-" + UUID.randomUUID() + ext;
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            photo.setImageUrl("/uploads/galerie/" + filename);
            galeriePhotoRepository.save(photo);
            return ResponseEntity.ok(photo);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload de l'image."));
        }
    }

    private static void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier image manquant.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("L'image ne doit pas dépasser 10 Mo.");
        }
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException("Format non autorisé. Utilisez JPG, PNG ou WebP.");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Le fichier doit être une image.");
        }
    }

    private static String extension(String original) {
        if (original == null || !original.contains(".")) {
            return ".jpg";
        }
        return original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }
}
