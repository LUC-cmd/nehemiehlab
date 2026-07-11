package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Publication;
import com.nehemiahlab.platform.repository.PublicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/publications")
public class PublicationController {

    @Autowired
    private PublicationRepository publicationRepository;

    @GetMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<Publication>> getAll() {
        return ResponseEntity.ok(publicationRepository.findAllByOrderByOrdreAscCreatedAtDesc());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<Publication> create(@RequestBody Publication publication) {
        publication.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(publicationRepository.save(publication));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Publication data) {
        return publicationRepository.findById(id)
                .map(pub -> {
                    pub.setTitre(data.getTitre());
                    pub.setDescription(data.getDescription());
                    pub.setType(data.getType());
                    pub.setContenu(data.getContenu());
                    pub.setLienExterne(data.getLienExterne());
                    pub.setActif(data.isActif());
                    pub.setOrdre(data.getOrdre() != null ? data.getOrdre() : pub.getOrdre());
                    if (data.getMediaUrl() != null) pub.setMediaUrl(data.getMediaUrl());
                    pub.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(publicationRepository.save(pub));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!publicationRepository.existsById(id)) return ResponseEntity.notFound().build();
        publicationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Publication supprimée."));
    }

    @PostMapping("/{id}/media")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> uploadMedia(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Publication pub = publicationRepository.findById(id).orElse(null);
        if (pub == null) return ResponseEntity.notFound().build();
        try {
            Path uploadDir = Paths.get("uploads", "publications");
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            String ext = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = UUID.randomUUID() + ext;
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            pub.setMediaUrl("/uploads/publications/" + filename);
            pub.setUpdatedAt(LocalDateTime.now());
            publicationRepository.save(pub);
            return ResponseEntity.ok(pub);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur upload."));
        }
    }
}
