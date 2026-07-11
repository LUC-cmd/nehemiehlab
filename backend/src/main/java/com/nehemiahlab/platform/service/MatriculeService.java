package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.repository.EleveRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.Locale;

/**
 * Matricule élève : AA + SKA + 4 chiffres (ex: 26SKA0487).
 * Les 4 derniers chiffres sont séquentiels selon l'ordre d'inscription.
 * Le matricule est uniquement un identifiant, jamais un secret d'authentification.
 */
@Service
public class MatriculeService {

    public static final String PATTERN = "^\\d{2}SKA\\d{4}$";

    @Autowired
    private EleveRepository eleveRepository;

    public String yearPrefix() {
        int yy = Year.now().getValue() % 100;
        return String.format(Locale.ROOT, "%02dSKA", yy);
    }

    /**
     * Génère AA + SKA + NNNN.
     * Les 4 derniers chiffres suivent l'ordre d'inscription de l'année :
     * 1er élève → 0001, 2e → 0002, etc.
     */
    public synchronized String generateUniqueMatricule() {
        String prefix = yearPrefix();
        String max = eleveRepository.findMaxMatriculeByPrefix(prefix).orElse(null);
        int next = 1;
        if (max != null && max.length() >= 9) {
            try {
                next = Integer.parseInt(max.substring(5)) + 1;
            } catch (NumberFormatException ignored) {
                next = 1;
            }
        }
        if (next < 1) next = 1;
        if (next > 9999) {
            throw new IllegalStateException(
                    "Limite de matricules atteinte pour l'année (" + prefix + ").");
        }
        String candidate = prefix + String.format(Locale.ROOT, "%04d", next);
        int guard = 0;
        while (eleveRepository.existsByMatricule(candidate) && guard < 50) {
            next++;
            if (next > 9999) {
                throw new IllegalStateException(
                        "Limite de matricules atteinte pour l'année (" + prefix + ").");
            }
            candidate = prefix + String.format(Locale.ROOT, "%04d", next);
            guard++;
        }
        return candidate;
    }

    public boolean isValidFormat(String matricule) {
        return matricule != null && matricule.toUpperCase(Locale.ROOT).matches(PATTERN);
    }

    public String normalize(String matricule) {
        return matricule == null ? "" : matricule.trim().toUpperCase(Locale.ROOT);
    }
}
