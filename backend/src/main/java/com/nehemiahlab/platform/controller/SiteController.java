package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Actualite;
import com.nehemiahlab.platform.model.GaleriePhoto;
import com.nehemiahlab.platform.model.Publication;
import com.nehemiahlab.platform.repository.ActualiteRepository;
import com.nehemiahlab.platform.repository.GaleriePhotoRepository;
import com.nehemiahlab.platform.repository.PublicationRepository;
import com.nehemiahlab.platform.service.InscriptionSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/** Endpoints publics du site vitrine (sans authentification) */
@RestController
@RequestMapping("/site")
public class SiteController {

    @Autowired
    private PublicationRepository publicationRepository;

    @Autowired
    private ActualiteRepository actualiteRepository;

    @Autowired
    private GaleriePhotoRepository galeriePhotoRepository;

    @Autowired
    private InscriptionSettingsService inscriptionSettingsService;

    @GetMapping("/publications")
    public ResponseEntity<List<Publication>> getPublicationsActives() {
        return ResponseEntity.ok(publicationRepository.findByActifTrueOrderByOrdreAscCreatedAtDesc());
    }

    @GetMapping("/publications/{id}")
    public ResponseEntity<Publication> getPublication(@PathVariable Long id) {
        return publicationRepository.findById(id)
                .filter(Publication::isActif)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/actualites")
    public ResponseEntity<List<Actualite>> getActualitesActives() {
        return ResponseEntity.ok(actualiteRepository.findByActifTrueOrderByCreatedAtDesc());
    }

    @GetMapping("/actualites/{id}")
    public ResponseEntity<Actualite> getActualite(@PathVariable Long id) {
        return actualiteRepository.findById(id)
                .filter(Actualite::isActif)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/galerie")
    public ResponseEntity<List<GaleriePhoto>> getGalerieActive() {
        return ResponseEntity.ok(galeriePhotoRepository.findByActifTrueOrderByOrdreAscCreatedAtDesc());
    }

    @GetMapping("/inscriptions-formateurs")
    public ResponseEntity<?> getInscriptionsFormateurs() {
        return ResponseEntity.ok(Map.of(
                "ouverte", inscriptionSettingsService.isInscriptionFormateursOuverte()
        ));
    }
}
