package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.ResourceCategory;
import com.nehemiahlab.platform.model.RessourceItem;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.repository.RessourceItemRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.service.InscriptionSettingsService;
import com.nehemiahlab.platform.service.MatriculeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Value("${app.seed.director-email:director@nehemiahlab.com}")
    private String seedDirectorEmail;

    @Value("${app.seed.director-password:password123}")
    private String seedDirectorPassword;

    @Value("${app.seed.demo-password:password123}")
    private String seedDemoPassword;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RessourceItemRepository ressourceItemRepository;

    @Autowired
    private InscriptionSettingsService inscriptionSettingsService;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private MatriculeService matriculeService;

    @Autowired
    private TogoDemoDataSeeder togoDemoDataSeeder;

    @Override
    public void run(String... args) throws Exception {
        if (seedDirectorPassword.isBlank() || seedDemoPassword.isBlank()) {
            throw new IllegalStateException(
                    "APP_SEED_DIRECTOR_PASSWORD et APP_SEED_DEMO_PASSWORD sont obligatoires lorsque app.seed.enabled=true.");
        }

        log.info("Initialisation explicite des données locales");
        Optional<User> directorOpt = userRepository.findByEmail(seedDirectorEmail);

        if (directorOpt.isEmpty()) {
            User director = User.builder()
                    .nom("Directeur")
                    .prenom("Jean")
                    .email(seedDirectorEmail)
                    .motDePasse(passwordEncoder.encode(seedDirectorPassword))
                    .role(Role.DIRECTEUR)
                    .telephone("+228 97 25 53 53")
                    .actif(true)
                    .build();
            userRepository.save(director);
            log.warn("Compte directeur de démonstration créé. Changez immédiatement ses identifiants.");
        }

        // Assure la présence du réglage (fermé par défaut tant que le Directeur ne l'ouvre pas).
        if (!inscriptionSettingsService.isInscriptionFormateursOuverte()) {
            inscriptionSettingsService.setInscriptionFormateursOuverte(false);
        }

        // Backfill matricules pour les élèves existants
        List<Eleve> sansMatricule = eleveRepository.findByMatriculeIsNull();
        for (Eleve e : sansMatricule) {
            e.setMatricule(matriculeService.generateUniqueMatricule());
            eleveRepository.save(e);
        }

        if (ressourceItemRepository.count() == 0) {
            ressourceItemRepository.save(RessourceItem.builder()
                    .titre("Guide de protection de l'enfance")
                    .description("Protocoles de prévention et de signalement pour garantir la sécurité des enfants.")
                    .categorie(ResourceCategory.PROTECTION_ENFANCE)
                    .actif(true)
                    .build());
            ressourceItemRepository.save(RessourceItem.builder()
                    .titre("Soft Skills SKA")
                    .description("Communication, leadership et collaboration appliqués aux ateliers SKA.")
                    .categorie(ResourceCategory.SOFT_SKILLS)
                    .actif(true)
                    .build());
            ressourceItemRepository.save(RessourceItem.builder()
                    .titre("Projets réalisés de référence")
                    .description("Catalogue des projets finalisés servant de modèle pédagogique.")
                    .categorie(ResourceCategory.PROJETS_REALISES)
                    .actif(true)
                    .build());
        }

        // Jeu de données Togo (centres GPS, élèves, séances) — une seule fois
        try {
            togoDemoDataSeeder.seedIfNeeded();
        } catch (Exception e) {
            log.error("Échec de l'initialisation des données de démonstration", e);
        }

        log.info("Initialisation des données locales terminée");
    }
}
