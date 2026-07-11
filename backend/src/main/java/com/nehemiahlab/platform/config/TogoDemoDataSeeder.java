package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Jeu de données réaliste Togo pour tests / démo :
 * 5 régions × 10 centres (2 clusters × 5) = 50 centres avec GPS réels,
 * 10 élèves / centre (noms togolais), séances déjà suivies.
 *
 * Ne s'exécute qu'une fois (si moins de 40 centres en base).
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class TogoDemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(TogoDemoDataSeeder.class);
    private static final String DEMO_MARKER = "SKA Lomé Bè";

    @Value("${app.seed.demo-password}")
    private String demoPassword;

    @Autowired private CentreRepository centreRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EleveRepository eleveRepository;
    @Autowired private SessionCoursRepository sessionCoursRepository;
    @Autowired private EvaluationSessionRepository evaluationSessionRepository;
    @Autowired private ModuleFormationRepository moduleFormationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private com.nehemiahlab.platform.service.MatriculeService matriculeService;

    private final Random random = new Random(2026);

    @Transactional
    public void seedIfNeeded() {
        if (centreRepository.count() >= 40 || centreRepository.findAll().stream()
                .anyMatch(c -> DEMO_MARKER.equalsIgnoreCase(c.getNom()))) {
            log.info("Données de démonstration déjà présentes, initialisation ignorée");
            return;
        }

        log.info("Chargement explicite des données de démonstration Togo");
        String encoded = passwordEncoder.encode(demoPassword);

        List<RegionPack> regions = buildRegions();
        int formateurIdx = 0;
        int respIdx = 0;
        int coordIdx = 0;
        int centresCreated = 0;
        int elevesCreated = 0;
        int sessionsCreated = 0;

        for (RegionPack region : regions) {
            for (ClusterPack cluster : region.clusters) {
                User responsable = ensureUser(
                        "resp" + (respIdx + 1) + "@ska.tg",
                        cluster.coordNom,
                        cluster.coordPrenom,
                        Role.RESPONSABLE_CLUSTER,
                        encoded,
                        cluster.phone,
                        cluster.name
                );
                respIdx++;

                // 2 formateurs / cluster : l'un couvre 3 centres, l'autre 2
                CentreDef first = cluster.centres.get(0);
                CentreDef mid = cluster.centres.get(Math.min(3, cluster.centres.size() - 1));
                User formateurA = ensureUser(
                        "form" + (formateurIdx + 1) + "@ska.tg",
                        first.formateurNom,
                        first.formateurPrenom,
                        Role.FORMATEUR,
                        encoded,
                        first.phone,
                        null
                );
                formateurIdx++;
                User formateurB = ensureUser(
                        "form" + (formateurIdx + 1) + "@ska.tg",
                        mid.formateurNom,
                        mid.formateurPrenom,
                        Role.FORMATEUR,
                        encoded,
                        mid.phone,
                        null
                );
                formateurIdx++;

                for (int centreIdx = 0; centreIdx < cluster.centres.size(); centreIdx++) {
                    CentreDef def = cluster.centres.get(centreIdx);
                    // 0,1,2 -> formateur A (3 centres) ; 3,4 -> formateur B (2 centres)
                    User formateur = centreIdx < 3 ? formateurA : formateurB;

                    User centreCoordinateur = ensureUser(
                            "coord" + (coordIdx + 1) + "@ska.tg",
                            "Coord. " + def.nom.replace("SKA ", ""),
                            def.ville,
                            Role.COORDINATEUR,
                            encoded,
                            def.phone,
                            null
                    );
                    coordIdx++;

                    Centre centre = Centre.builder()
                            .nom(def.nom)
                            .adresse(def.adresse)
                            .ville(def.ville)
                            .region(region.name)
                            .cluster(cluster.name)
                            .latitude(def.lat)
                            .longitude(def.lng)
                            .coordinateur(centreCoordinateur)
                            .formateurs(new HashSet<>(Set.of(formateur)))
                            .build();
                    centre = centreRepository.save(centre);
                    centresCreated++;

                    List<Eleve> eleves = new ArrayList<>();
                    for (int i = 0; i < 10; i++) {
                        String[] name = pickChildName(i + centresCreated);
                        String sexe = name[2];
                        int age = 8 + random.nextInt(8); // 8–15
                        String classe = pickClasse(age);
                        LocalDate debut = LocalDate.now().minusMonths(2 + random.nextInt(8));
                        double heures = 6.0 + random.nextInt(40) + random.nextDouble();

                        Projet projet = Projet.builder()
                                .nom(pickProjet(i))
                                .description("Projet pédagogique SKA — " + def.ville + ".")
                                .evolution(15 + random.nextInt(80))
                                .build();

                        Eleve eleve = Eleve.builder()
                                .nom(name[0])
                                .prenom(name[1])
                                .matricule(matriculeService.generateUniqueMatricule())
                                .age(age)
                                .sexe(sexe)
                                .classe(classe)
                                .centre(centre)
                                .formateur(formateur)
                                .dateDebutFormation(debut)
                                .totalHeures(Math.round(heures * 10.0) / 10.0)
                                .projet(projet)
                                .build();
                        eleves.add(eleveRepository.save(eleve));
                        elevesCreated++;
                    }

                    // 5 à 8 séances déjà clôturées + journal de formation
                    int nbSessions = 5 + random.nextInt(4);
                    for (int s = 0; s < nbSessions; s++) {
                        LocalDateTime debut = LocalDateTime.now()
                                .minusDays(3L + s * 7L + random.nextInt(3))
                                .withHour(9 + random.nextInt(4))
                                .withMinute(0)
                                .withSecond(0)
                                .withNano(0);
                        int duree = 90 + random.nextInt(60);
                        double jitterLat = (random.nextDouble() - 0.5) * 0.004;
                        double jitterLng = (random.nextDouble() - 0.5) * 0.004;

                        SessionCours session = SessionCours.builder()
                                .titre(pickSessionTitre(s))
                                .centre(centre)
                                .formateur(formateur)
                                .heureDebut(debut)
                                .dureePrevueMinutes(duree)
                                .dureeReelleMinutes((long) (duree - 5 + random.nextInt(15)))
                                .statut("CLOTUREE")
                                .latitudeDebut(def.lat + jitterLat)
                                .longitudeDebut(def.lng + jitterLng)
                                .precisionDebutMetres(8.0 + random.nextDouble() * 20)
                                .latitudeFin(def.lat + jitterLat * 0.5)
                                .longitudeFin(def.lng + jitterLng * 0.5)
                                .precisionFinMetres(10.0 + random.nextDouble() * 15)
                                .etatEquipements(pickEquipement())
                                .defisSession(pickDefi())
                                .build();
                        session = sessionCoursRepository.save(session);
                        sessionsCreated++;

                        List<Long> presents = new ArrayList<>();
                        for (Eleve e : eleves) {
                            boolean present = random.nextDouble() > 0.12;
                            Double note = present ? (10.0 + random.nextInt(11) + random.nextDouble()) : null;
                            if (note != null) {
                                note = Math.min(20.0, Math.round(note * 10.0) / 10.0);
                            }
                            evaluationSessionRepository.save(EvaluationSession.builder()
                                    .sessionCours(session)
                                    .eleve(e)
                                    .present(present)
                                    .note(note)
                                    .build());
                            if (present) presents.add(e.getId());
                        }

                        moduleFormationRepository.save(ModuleFormation.builder()
                                .date(debut.toLocalDate())
                                .centreId(centre.getId())
                                .formateurId(formateur.getId())
                                .titre(session.getTitre())
                                .description("Séance réalisée à " + def.ville + " (" + region.name + ").")
                                .dureeHeures(Math.round((duree / 60.0) * 10.0) / 10.0)
                                .elevesPresents(presents)
                                .build());
                    }
                }
            }
        }

        log.info("Données de démonstration créées: centres={}, élèves={}, séances={}, responsables={}, coordinateurs={}, formateurs={}",
                centresCreated, elevesCreated, sessionsCreated, respIdx, coordIdx, formateurIdx);
    }

    private User ensureUser(String email, String nom, String prenom, Role role, String encoded, String phone, String assignedCluster) {
        return userRepository.findByEmail(email).map(existing -> {
            boolean changed = false;
            if (existing.getRole() != role) {
                existing.setRole(role);
                changed = true;
            }
            if (assignedCluster != null && !assignedCluster.isBlank()
                    && !assignedCluster.equals(existing.getAssignedCluster())) {
                existing.setAssignedCluster(assignedCluster);
                changed = true;
            }
            if (!existing.isActif()) {
                existing.setActif(true);
                changed = true;
            }
            if (changed) {
                return userRepository.save(existing);
            }
            return existing;
        }).orElseGet(() -> {
            User.UserBuilder builder = User.builder()
                    .email(email)
                    .nom(nom)
                    .prenom(prenom)
                    .role(role)
                    .motDePasse(encoded)
                    .telephone(phone)
                    .actif(true);
            if (assignedCluster != null && !assignedCluster.isBlank()) {
                builder.assignedCluster(assignedCluster);
            }
            return userRepository.save(builder.build());
        });
    }

    private static String slug(String raw) {
        return raw.toLowerCase(Locale.ROOT)
                .replace("é", "e").replace("è", "e").replace("ê", "e")
                .replace("à", "a").replace("ô", "o").replace("û", "u")
                .replaceAll("[^a-z0-9]+", ".")
                .replaceAll("^\\.|\\.$", "");
    }

    // ─── Données géographiques Togo ───────────────────────────────────────

    private List<RegionPack> buildRegions() {
        List<RegionPack> list = new ArrayList<>();

        // MARITIME — Lomé & périphérie
        list.add(new RegionPack("Maritime", List.of(
                new ClusterPack("Cluster Lomé Est", "Amegbo", "Kossi", "+228 90 11 20 01", List.of(
                        c("SKA Lomé Bè", "Quartier Bè-Kpota, près du marché", "Lomé", 6.1375, 1.2458, "Adjo", "Komlan", "+228 90 11 21 01"),
                        c("SKA Lomé Tokoin", "Tokoin Habitat, avenue de la Liberation", "Lomé", 6.1612, 1.2341, "Mensah", "Yawo", "+228 90 11 21 02"),
                        c("SKA Lomé Nyékonakpoè", "Nyékonakpoè, rue des Palmiers", "Lomé", 6.1488, 1.2510, "Agbeko", "Selom", "+228 90 11 21 03"),
                        c("SKA Lomé Hedzranawoe", "Hedzranawoe, derrière le stade", "Lomé", 6.1720, 1.2185, "Tamakloe", "Afi", "+228 90 11 21 04"),
                        c("SKA Lomé Amoutivé", "Amoutivé, près de l'église", "Lomé", 6.1255, 1.2380, "Lawson", "Kodjo", "+228 90 11 21 05")
                )),
                new ClusterPack("Cluster Maritime Ouest", "Gaba", "Akouvi", "+228 90 11 20 02", List.of(
                        c("SKA Agoè Nyivé", "Agoè Nyivé, route de Kpalimé", "Agoè", 6.2050, 1.1750, "Ocloo", "Efua", "+228 90 11 22 01"),
                        c("SKA Tsévié Centre", "Tsévié, quartier administratif", "Tsévié", 6.4261, 1.2133, "Ayivi", "Koffi", "+228 90 11 22 02"),
                        c("SKA Aného Plage", "Aného, près de la lagune", "Aného", 6.2278, 1.5919, "Quashie", "Ama", "+228 90 11 22 03"),
                        c("SKA Vogan", "Vogan, marché central", "Vogan", 6.3333, 1.5280, "Dossou", "Messan", "+228 90 11 22 04"),
                        c("SKA Tabligbo", "Tabligbo, axe Aného", "Tabligbo", 6.5830, 1.5000, "Sossou", "Akpene", "+228 90 11 22 05")
                ))
        )));

        // PLATEAUX
        list.add(new RegionPack("Plateaux", List.of(
                new ClusterPack("Cluster Kpalimé", "Agbo", "Yao", "+228 90 22 20 01", List.of(
                        c("SKA Kpalimé Centre", "Kpalimé, avenue des Cocotiers", "Kpalimé", 6.9000, 0.6300, "Klutse", "Edem", "+228 90 22 21 01"),
                        c("SKA Kpalimé Agomé", "Agomé-Yoh, colline", "Kpalimé", 6.9150, 0.6450, "Amouzou", "Sena", "+228 90 22 21 02"),
                        c("SKA Badou", "Badou, centre-ville", "Badou", 7.5830, 0.6000, "Tete", "Kokou", "+228 90 22 21 03"),
                        c("SKA Danyi", "Danyi-Apéyémé", "Danyi", 7.1500, 0.7000, "Akakpo", "Dela", "+228 90 22 21 04"),
                        c("SKA Agou", "Agou-Gadzébé", "Agou", 6.8500, 0.7500, "Folly", "Kossiwa", "+228 90 22 21 05")
                )),
                new ClusterPack("Cluster Atakpamé", "Kpatcha", "Afiavi", "+228 90 22 20 02", List.of(
                        c("SKA Atakpamé Centre", "Atakpamé, quartier Habité", "Atakpamé", 7.5269, 1.1244, "Nayo", "Komi", "+228 90 22 22 01"),
                        c("SKA Atakpamé Elavagnon", "Elavagnon", "Atakpamé", 7.5400, 1.1400, "Adje", "Mawuli", "+228 90 22 22 02"),
                        c("SKA Notsé", "Notsé, près du palais", "Notsé", 6.9500, 1.1667, "Blagogee", "Akosua", "+228 90 22 22 03"),
                        c("SKA Tohoun", "Tohoun, axe frontière", "Tohoun", 7.0167, 1.6167, "Hounkpe", "Seth", "+228 90 22 22 04"),
                        c("SKA Anié", "Anié, marché", "Anié", 7.7500, 1.2000, "Gaba", "Elom", "+228 90 22 22 05")
                ))
        )));

        // CENTRALE
        list.add(new RegionPack("Centrale", List.of(
                new ClusterPack("Cluster Sokodé", "Tchaou", "Issifou", "+228 90 33 20 01", List.of(
                        c("SKA Sokodé Centre", "Sokodé, quartier Kparatao", "Sokodé", 8.9833, 1.1333, "Alassani", "Moumouni", "+228 90 33 21 01"),
                        c("SKA Sokodé Komah", "Komah", "Sokodé", 8.9950, 1.1450, "Bawa", "Rachida", "+228 90 33 21 02"),
                        c("SKA Tchamba", "Tchamba, centre", "Tchamba", 9.0333, 1.4167, "Sama", "Abdul", "+228 90 33 21 03"),
                        c("SKA Sotouboua", "Sotouboua, axe nationale", "Sotouboua", 8.5667, 0.9833, "Kader", "Fatou", "+228 90 33 21 04"),
                        c("SKA Blitta", "Blitta, gare routière", "Blitta", 8.3167, 0.9833, "Yaya", "Aicha", "+228 90 33 21 05")
                )),
                new ClusterPack("Cluster Centrale Est", "Ouro", "Mariam", "+228 90 33 20 02", List.of(
                        c("SKA Bafilo", "Bafilo, quartier marché", "Bafilo", 9.3500, 1.2667, "Idrissou", "Salim", "+228 90 33 22 01"),
                        c("SKA Guerin-Kouka", "Guérin-Kouka", "Guérin-Kouka", 9.2000, 0.6500, "Amadou", "Hawa", "+228 90 33 22 02"),
                        c("SKA Fazao", "Fazao, entrée parc", "Fazao", 8.7000, 0.7667, "Boukari", "Zeinab", "+228 90 33 22 03"),
                        c("SKA Kambolé", "Kambolé", "Kambolé", 8.8500, 1.3500, "Sani", "Mariamou", "+228 90 33 22 04"),
                        c("SKA Titigbé", "Titigbé", "Titigbé", 8.4500, 1.0500, "Moussa", "Amina", "+228 90 33 22 05")
                ))
        )));

        // KARA
        list.add(new RegionPack("Kara", List.of(
                new ClusterPack("Cluster Kara Ville", "Lamboni", "Pikame", "+228 90 44 20 01", List.of(
                        c("SKA Kara Centre", "Kara, quartier Tomdè", "Kara", 9.5511, 1.1861, "Tchalim", "Esso", "+228 90 44 21 01"),
                        c("SKA Kara Lama", "Lama-Kara", "Kara", 9.5600, 1.2000, "Nadjo", "Kossi", "+228 90 44 21 02"),
                        c("SKA Niamtougou", "Niamtougou, aérodrome", "Niamtougou", 9.7681, 1.1053, "Pitala", "Afi", "+228 90 44 21 03"),
                        c("SKA Pagouda", "Pagouda, centre", "Pagouda", 9.7500, 1.3167, "Kadjanga", "Yawa", "+228 90 44 21 04"),
                        c("SKA Bassar", "Bassar, marché", "Bassar", 9.2500, 0.7833, "Nabede", "Komlan", "+228 90 44 21 05")
                )),
                new ClusterPack("Cluster Kara Nord", "Kombate", "Lare", "+228 90 44 20 02", List.of(
                        c("SKA Kandé", "Kandé, axe Dapaong", "Kandé", 9.9500, 1.0500, "Tengue", "Selom", "+228 90 44 22 01"),
                        c("SKA Keran", "Kéran", "Kéran", 10.0500, 0.9000, "Douti", "Akpene", "+228 90 44 22 02"),
                        c("SKA Binah", "Binah, Pagouda périphérie", "Binah", 9.8000, 1.2800, "Agboka", "Mawuli", "+228 90 44 22 03"),
                        c("SKA Assoli", "Assoli", "Assoli", 9.4000, 1.0500, "Sama", "Efua", "+228 90 44 22 04"),
                        c("SKA Dankpen", "Dankpen", "Dankpen", 9.1500, 0.5500, "Yakubu", "Afiavi", "+228 90 44 22 05")
                ))
        )));

        // SAVANES
        list.add(new RegionPack("Savanes", List.of(
                new ClusterPack("Cluster Dapaong", "Lare", "Bawoul", "+228 90 55 20 01", List.of(
                        c("SKA Dapaong Centre", "Dapaong, quartier Habité", "Dapaong", 10.8623, 0.2076, "Kombate", "Issaka", "+228 90 55 21 01"),
                        c("SKA Dapaong Gando", "Gando", "Dapaong", 10.8750, 0.2200, "Namo", "Fati", "+228 90 55 21 02"),
                        c("SKA Cinkassé", "Cinkassé, frontière", "Cinkassé", 11.1030, 0.0100, "Ouoba", "Abdoul", "+228 90 55 21 03"),
                        c("SKA Tandjouaré", "Tandjouaré", "Tandjouaré", 10.6500, 0.1500, "Pini", "Aicha", "+228 90 55 21 04"),
                        c("SKA Bombouaka", "Bombouaka", "Bombouaka", 10.7500, 0.0500, "Sambiani", "Moussa", "+228 90 55 21 05")
                )),
                new ClusterPack("Cluster Mango", "Namo", "Salimata", "+228 90 55 20 02", List.of(
                        c("SKA Mango Centre", "Mango, marché central", "Mango", 10.3590, 0.4710, "Bawoul", "Ibrahim", "+228 90 55 22 01"),
                        c("SKA Gando", "Gando-Namoni", "Gando", 10.4500, 0.3500, "Kombate", "Rokia", "+228 90 55 22 02"),
                        c("SKA Oti", "Oti, axe Mango", "Oti", 10.2500, 0.5500, "Lare", "Sani", "+228 90 55 22 03"),
                        c("SKA Mandouri", "Mandouri", "Mandouri", 10.8500, 0.6500, "Tengue", "Hawa", "+228 90 55 22 04"),
                        c("SKA Barkoissi", "Barkoissi", "Barkoissi", 10.5500, 0.4000, "Douti", "Yacouba", "+228 90 55 22 05")
                ))
        )));

        return list;
    }

    private static CentreDef c(String nom, String adresse, String ville, double lat, double lng,
                               String fNom, String fPrenom, String phone) {
        return new CentreDef(nom, adresse, ville, lat, lng, fNom, fPrenom, phone);
    }

    private String[] pickChildName(int seed) {
        String[][] boys = {
                {"Mensah", "Kofi", "M"}, {"Agbeko", "Yawo", "M"}, {"Lawson", "Kodjo", "M"},
                {"Amouzou", "Selom", "M"}, {"Tamakloe", "Komlan", "M"}, {"Ayivi", "Edem", "M"},
                {"Klutse", "Mawuli", "M"}, {"Ocloo", "Seth", "M"}, {"Dossou", "Kokou", "M"},
                {"Alassani", "Issa", "M"}, {"Bawa", "Moussa", "M"}, {"Tchalim", "Esso", "M"},
                {"Kombate", "Abdoul", "M"}, {"Namo", "Ibrahim", "M"}, {"Sama", "Yao", "M"},
                {"Adje", "Messan", "M"}, {"Folly", "Kossi", "M"}, {"Nayo", "Komi", "M"}
        };
        String[][] girls = {
                {"Adjo", "Ama", "F"}, {"Gaba", "Akouvi", "F"}, {"Quashie", "Efua", "F"},
                {"Sossou", "Akpene", "F"}, {"Amegbo", "Afi", "F"}, {"Blagogee", "Dela", "F"},
                {"Akakpo", "Kossiwa", "F"}, {"Tete", "Afiavi", "F"}, {"Hounkpe", "Elom", "F"},
                {"Rachida", "Fatou", "F"}, {"Aicha", "Mariam", "F"}, {"Pikame", "Yawa", "F"},
                {"Fati", "Salimata", "F"}, {"Hawa", "Amina", "F"}, {"Akosua", "Sena", "F"},
                {"Kossiwa", "Afi", "F"}, {"Mawusi", "Akpene", "F"}, {"Edem", "Ama", "F"}
        };
        boolean girl = (seed % 2 == 0);
        String[][] pool = girl ? girls : boys;
        return pool[Math.floorMod(seed * 7 + 3, pool.length)];
    }

    private String pickClasse(int age) {
        if (age <= 9) return "CE2";
        if (age <= 11) return "CM1";
        if (age <= 13) return "CM2";
        return "6ème";
    }

    private String pickProjet(int i) {
        String[] projets = {
                "Robot suiveur de ligne", "Application Scratch météo", "Maison solaire miniature",
                "Jeu éducatif Scratch", "Capteur d'humidité Arduino", "Storytelling digital",
                "Maquette ville intelligente", "Podcast jeunes innovateurs", "Drone papier + code",
                "Affiche 3D du quartier"
        };
        return projets[Math.floorMod(i, projets.length)];
    }

    private String pickSessionTitre(int s) {
        String[] titres = {
                "Initiation Scratch — boucles", "Électronique : LED & résistances",
                "Projet robot — assemblage", "Soft skills : travail d'équipe",
                "Protection de l'enfance — atelier", "Scratch : variables & conditions",
                "Arduino : capteurs", "Présentation de projets",
                "Créativité numérique", "Révision & défis pratiques"
        };
        return titres[Math.floorMod(s, titres.length)];
    }

    private String pickEquipement() {
        String[] e = {
                "Ordinateurs OK, 1 souris défectueuse",
                "Tablettes chargées, connexion stable",
                "Kits Arduino complets",
                "Vidéoprojecteur OK, enceinte faible",
                "Matériel complet, salle climatisée"
        };
        return e[random.nextInt(e.length)];
    }

    private String pickDefi() {
        String[] d = {
                "Coupure d'électricité 20 min — séance adaptée",
                "2 élèves absents pour raison familiale",
                "Connexion internet intermittente",
                "Aucun défi majeur",
                "Groupe très motivé, rythme accéléré"
        };
        return d[random.nextInt(d.length)];
    }

    // ─── records internes ─────────────────────────────────────────────────

    private record RegionPack(String name, List<ClusterPack> clusters) {}
    private record ClusterPack(String name, String coordNom, String coordPrenom, String phone, List<CentreDef> centres) {}
    private record CentreDef(String nom, String adresse, String ville, double lat, double lng,
                             String formateurNom, String formateurPrenom, String phone) {}
}
