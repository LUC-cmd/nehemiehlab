package com.nehemiahlab.platform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Contenu site public — les profils enfants restent privés (dashboard uniquement).
 */
@RestController
@RequestMapping("/site")
public class SiteContentController {

    @GetMapping("/enfants-profils")
    public ResponseEntity<?> getProfilsEnfantsPublics() {
        // Plus exposé publiquement : réservé à la plateforme privée
        return ResponseEntity.status(404).body(Map.of(
                "message", "Les profils enfants ne sont pas disponibles sur le site public."
        ));
    }
}
