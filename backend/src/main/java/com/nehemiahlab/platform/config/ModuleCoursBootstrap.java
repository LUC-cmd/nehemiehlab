package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.ModuleCours;
import com.nehemiahlab.platform.repository.ModuleCoursRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(20)
public class ModuleCoursBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ModuleCoursBootstrap.class);

    private final ModuleCoursRepository moduleCoursRepository;

    public ModuleCoursBootstrap(ModuleCoursRepository moduleCoursRepository) {
        this.moduleCoursRepository = moduleCoursRepository;
    }

    @Override
    public void run(String... args) {
        if (moduleCoursRepository.count() > 0) {
            return;
        }
        log.info("Publication des 4 modules pédagogiques SKA de référence");
        moduleCoursRepository.save(ModuleCours.builder()
                .numeroOrdre(1)
                .titre("Scratch — Initiation à la programmation")
                .description("Découverte de Scratch : sprites, boucles, conditions et premiers jeux.")
                .objectifs("Créer un mini-jeu interactif et expliquer une boucle simple.")
                .dureeRecommandeeHeures(2.0)
                .niveau("Débutant")
                .actif(true)
                .build());
        moduleCoursRepository.save(ModuleCours.builder()
                .numeroOrdre(2)
                .titre("Électronique & Arduino")
                .description("LED, résistances, capteurs et premiers montages sur Arduino.")
                .objectifs("Monter un circuit fonctionnel et documenter le schéma.")
                .dureeRecommandeeHeures(3.0)
                .niveau("Intermédiaire")
                .actif(true)
                .build());
        moduleCoursRepository.save(ModuleCours.builder()
                .numeroOrdre(3)
                .titre("Robotique créative")
                .description("Assemblage, programmation et tests d'un robot éducatif.")
                .objectifs("Faire avancer un robot et corriger un défaut mécanique.")
                .dureeRecommandeeHeures(3.0)
                .niveau("Intermédiaire")
                .actif(true)
                .build());
        moduleCoursRepository.save(ModuleCours.builder()
                .numeroOrdre(4)
                .titre("Soft skills & protection de l'enfance")
                .description("Communication, posture éducative et protocoles de protection.")
                .objectifs("Animer un atelier bienveillant et repérer une situation à signaler.")
                .dureeRecommandeeHeures(2.0)
                .niveau("Tous niveaux")
                .actif(true)
                .build());
    }
}
