package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Banque;
import com.nehemiahlab.platform.repository.BanqueRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Banques disponibles — seules celles ajoutées par le comptable sont sélectionnables. */
@RestController
@RequestMapping("/banques")
public class BanqueController {

    @Autowired
    private BanqueRepository banqueRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR')")
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(banqueRepository.findAll(Sort.by(Sort.Direction.ASC, "nom")));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('COMPTABLE', 'DIRECTEUR')")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String nom = InputSanitizer.clean(body.getOrDefault("nom", "")).trim();
        if (nom.length() < 2 || nom.length() > 120) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nom de la banque doit contenir entre 2 et 120 caractères."));
        }
        if (banqueRepository.existsByNomIgnoreCase(nom)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cette banque existe déjà."));
        }
        Banque saved = banqueRepository.save(Banque.builder().nom(nom).build());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('COMPTABLE', 'DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!banqueRepository.existsById(id)) return ResponseEntity.notFound().build();
        banqueRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Banque supprimée."));
    }
}
