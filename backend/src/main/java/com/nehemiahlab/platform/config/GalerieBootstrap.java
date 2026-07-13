package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.GaleriePhoto;
import com.nehemiahlab.platform.repository.GaleriePhotoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/** Initialise la galerie publique avec les visuels par défaut si la table est vide. */
@Component
@Order(900)
public class GalerieBootstrap {

    private static final Logger log = LoggerFactory.getLogger(GalerieBootstrap.class);

    private final GaleriePhotoRepository galeriePhotoRepository;

    public GalerieBootstrap(GaleriePhotoRepository galeriePhotoRepository) {
        this.galeriePhotoRepository = galeriePhotoRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapOnReady() {
        if (galeriePhotoRepository.count() > 0) {
            return;
        }

        List<GaleriePhoto> defaults = List.of(
                photo(0, "Enfants apprenant la programmation Scratch", "/assets/images/hero-atelier-scratch.png"),
                photo(1, "Groupe Smart Kids Academy devant la bannière", "/assets/images/galerie-groupe.png"),
                photo(2, "Session de formation avec un formateur", "/assets/images/galerie-formation.png"),
                photo(3, "Atelier en classe avec ordinateurs portables", "/assets/images/galerie-classe.png"),
                photo(4, "Accompagnement des élèves sur ordinateur", "/assets/images/galerie-mentorat.png"),
                photo(5, "Apprentissage collaboratif à Smart Kids Academy", "/assets/images/galerie-apprentissage.png")
        );

        galeriePhotoRepository.saveAll(defaults);
        log.info("Galerie publique initialisée avec {} photo(s) par défaut.", defaults.size());
    }

    private static GaleriePhoto photo(int ordre, String legende, String imageUrl) {
        return GaleriePhoto.builder()
                .legende(legende)
                .imageUrl(imageUrl)
                .ordre(ordre)
                .actif(true)
                .build();
    }
}
