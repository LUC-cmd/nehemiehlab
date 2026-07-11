package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Actualite;
import com.nehemiahlab.platform.repository.ActualiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/actualites")
public class ActualiteController {

    @Autowired
    private ActualiteRepository actualiteRepository;

    @GetMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<List<Actualite>> getAll() {
        return ResponseEntity.ok(actualiteRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<Actualite> create(@RequestBody Actualite actualite) {
        return ResponseEntity.ok(actualiteRepository.save(actualite));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Actualite data) {
        return actualiteRepository.findById(id)
                .map(a -> {
                    a.setTitre(data.getTitre());
                    a.setResume(data.getResume());
                    a.setContenu(data.getContenu());
                    a.setStatut(data.getStatut());
                    a.setDateDebut(data.getDateDebut());
                    a.setDateFin(data.getDateFin());
                    a.setActif(data.isActif());
                    if (data.getImageUrl() != null) a.setImageUrl(data.getImageUrl());
                    return ResponseEntity.ok(actualiteRepository.save(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!actualiteRepository.existsById(id)) return ResponseEntity.notFound().build();
        actualiteRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Actualité supprimée."));
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Actualite actu = actualiteRepository.findById(id).orElse(null);
        if (actu == null) return ResponseEntity.notFound().build();
        try {
            Path uploadDir = Paths.get("uploads", "actualites");
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            String ext = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = UUID.randomUUID() + ext;
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            actu.setImageUrl("/uploads/actualites/" + filename);
            actualiteRepository.save(actu);
            return ResponseEntity.ok(actu);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur upload."));
        }
    }
}
