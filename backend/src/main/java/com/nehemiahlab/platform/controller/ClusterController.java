package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Cluster;
import com.nehemiahlab.platform.repository.ClusterRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Catalogue des clusters (regroupements de centres). Permet au Directeur de
 * creer un cluster une seule fois puis de le selectionner dans une liste a
 * chaque creation de centre, afin d'eviter les doublons de saisie libre
 * (ex: "Zone Nord" vs "zone nord" vs "ZoneNord").
 */
@RestController
@RequestMapping("/clusters")
public class ClusterController {

    @Autowired
    private ClusterRepository clusterRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'RESPONSABLE_CLUSTER', 'COORDINATEUR', 'FORMATEUR', 'COMPTABLE', 'STAFF_NEHEMIAH', 'ANIMATEUR')")
    public ResponseEntity<List<Cluster>> getAll() {
        return ResponseEntity.ok(clusterRepository.findAllByOrderByNomAsc());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String nom = body.get("nom") != null ? InputSanitizer.clean(body.get("nom")).trim() : "";
        if (nom.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nom du cluster est obligatoire."));
        }
        if (clusterRepository.findByNomIgnoreCase(nom).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ce cluster existe deja."));
        }
        Cluster saved = clusterRepository.save(Cluster.builder().nom(nom).build());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (clusterRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        clusterRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Cluster supprime."));
    }
}
