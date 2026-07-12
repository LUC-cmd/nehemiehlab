package com.nehemiahlab.platform.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nehemiahlab.platform.model.PlatformSetting;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.repository.PlatformSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Permissions dashboard par rôle — le Directeur active/désactive
 * ce que chaque compte peut voir (et éventuellement modifier).
 */
@Service
public class RoleAccessService {

    public static final String KEY = "ROLE_DASHBOARD_ACCESS";

    /** Fonctionnalités configurables */
    public static final List<String> ALL_FEATURES = List.of(
            "home",
            "centres",
            "mes-centres",
            "formateurs",
            "eleves",
            "sessions",
            "formations",
            "supports-cours",
            "journal-activite",
            "evaluation-formateur",
            "transactions",
            "rapports",
            "publications",
            "actualites",
            "galerie",
            "ressources",
            "communaute",
            "profils-enfants",
            "controle-gestion",
            "utilisateurs",
            "signalements",
            "permissions",
            "profil",
            // Capacités d'action
            "edit_centre_location",
            "create_eleve",
            "manage_sessions",
            "validate_transactions",
            "manage_signalements"
    );

    @Autowired
    private PlatformSettingRepository platformSettingRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Matrice par défaut (état actuel du produit) */
    public Map<String, Set<String>> defaultMatrix() {
        Map<String, Set<String>> m = new LinkedHashMap<>();
        m.put(Role.DIRECTEUR.name(), set(
                "home", "centres", "formateurs", "eleves", "sessions", "formations", "supports-cours",
                "journal-activite", "evaluation-formateur",
                "transactions", "rapports", "publications", "actualites", "galerie", "ressources",
                "communaute", "profils-enfants", "controle-gestion", "utilisateurs",
                "permissions", "profil",
                "edit_centre_location", "create_eleve", "manage_sessions",
                "manage_signalements"
        ));
        m.put(Role.FORMATEUR.name(), set(
                "home", "mes-centres", "eleves", "sessions", "formations", "supports-cours", "evaluation-formateur", "ressources",
                "communaute", "profils-enfants", "transactions", "rapports", "profil",
                "edit_centre_location", "create_eleve", "manage_sessions", "validate_transactions"
        ));
        m.put(Role.COORDINATEUR.name(), set(
                "home", "mes-centres", "eleves", "formations", "supports-cours", "ressources", "communaute",
                "profils-enfants", "signalements", "rapports", "profil",
                "edit_centre_location", "create_eleve", "manage_signalements"
        ));
        m.put(Role.RESPONSABLE_CLUSTER.name(), set(
                "home", "mes-centres", "eleves", "sessions", "formations", "supports-cours", "ressources", "communaute",
                "profils-enfants", "signalements", "rapports", "profil",
                "edit_centre_location", "create_eleve", "manage_signalements"
        ));
        m.put(Role.COMPTABLE.name(), set(
                "home", "transactions", "rapports", "communaute", "controle-gestion", "profil",
                "validate_transactions"
        ));
        m.put(Role.STAFF_NEHEMIAH.name(), set("home", "ressources", "communaute", "profil"));
        m.put(Role.ANIMATEUR.name(), set("home", "ressources", "communaute", "profil"));
        m.put(Role.PARENT.name(), set("home", "profil"));
        m.put(Role.BENEVOLE.name(), set("home", "communaute", "profil"));
        m.put(Role.PARTICIPANT.name(), set("home", "communaute", "profil"));
        return m;
    }

    /** Fonctions verrouillées (le Directeur ne peut pas les retirer) */
    public Map<String, Set<String>> lockedFeatures() {
        Map<String, Set<String>> m = new LinkedHashMap<>();
        m.put(Role.DIRECTEUR.name(), set("home", "utilisateurs", "permissions", "profil"));
        m.put(Role.PARENT.name(), set("home", "profil"));
        for (Role r : Role.values()) {
            m.putIfAbsent(r.name(), set("home", "profil"));
        }
        return m;
    }

    public Map<String, Set<String>> getMatrix() {
        Optional<PlatformSetting> opt = platformSettingRepository.findById(KEY);
        if (opt.isEmpty()) {
            return defaultMatrix();
        }
        try {
            Map<String, List<String>> raw = objectMapper.readValue(
                    opt.get().getValeur(),
                    new TypeReference<Map<String, List<String>>>() {}
            );
            Map<String, Set<String>> result = defaultMatrix();
            for (Map.Entry<String, List<String>> e : raw.entrySet()) {
                Set<String> features = new LinkedHashSet<>();
                for (String f : e.getValue()) {
                    if (ALL_FEATURES.contains(f)) features.add(f);
                }
                // Toujours garder les locked
                features.addAll(lockedFeatures().getOrDefault(e.getKey(), Set.of()));
                result.put(e.getKey(), features);
            }
            return result;
        } catch (Exception ex) {
            return defaultMatrix();
        }
    }

    public Map<String, Set<String>> saveMatrix(Map<String, Collection<String>> incoming) {
        Map<String, Set<String>> locked = lockedFeatures();
        Map<String, Set<String>> cleaned = new LinkedHashMap<>();

        for (Role role : Role.values()) {
            String key = role.name();
            Set<String> features = new LinkedHashSet<>();
            Collection<String> src = incoming.getOrDefault(key, List.of());
            for (String f : src) {
                if (ALL_FEATURES.contains(f)) features.add(f);
            }
            features.addAll(locked.getOrDefault(key, Set.of()));

            // Directeur garde toujours le pilotage
            if (role == Role.DIRECTEUR) {
                features.addAll(defaultMatrix().get(Role.DIRECTEUR.name()));
            }
            // Parent : pas d'élargissement dangereux hors home/profil
            if (role == Role.PARENT) {
                features.retainAll(Set.of("home", "profil"));
            }
            cleaned.put(key, features);
        }

        try {
            String json = objectMapper.writeValueAsString(cleaned);
            // PlatformSetting.valeur max 500 — trop court pour JSON complet
            // On stocke en plusieurs clés si besoin, sinon on élargit via TEXT
            platformSettingRepository.save(PlatformSetting.builder()
                    .cle(KEY)
                    .valeur(json)
                    .build());
        } catch (Exception e) {
            throw new IllegalStateException("Impossible d'enregistrer les permissions: " + e.getMessage());
        }
        return cleaned;
    }

    public Set<String> featuresFor(Role role) {
        if (role == null) return Set.of();
        return getMatrix().getOrDefault(role.name(), Set.of());
    }

    public boolean hasFeature(Role role, String feature) {
        return featuresFor(role).contains(feature);
    }

    private static Set<String> set(String... values) {
        return new LinkedHashSet<>(Arrays.asList(values));
    }
}
