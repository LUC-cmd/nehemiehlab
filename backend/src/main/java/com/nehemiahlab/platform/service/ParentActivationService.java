package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.ParentActivationCode;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.ParentActivationCodeRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.PasswordPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class ParentActivationService {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration CODE_LIFETIME = Duration.ofHours(48);
    private static final Duration LOCK_DURATION = Duration.ofMinutes(30);

    private final ParentActivationCodeRepository codeRepository;
    private final EleveRepository eleveRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MatriculeService matriculeService;

    public ParentActivationService(
            ParentActivationCodeRepository codeRepository,
            EleveRepository eleveRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            MatriculeService matriculeService
    ) {
        this.codeRepository = codeRepository;
        this.eleveRepository = eleveRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.matriculeService = matriculeService;
    }

    @Transactional
    public IssuedCode issue(Long eleveId) {
        Eleve eleve = eleveRepository.findById(eleveId)
                .orElseThrow(() -> new IllegalArgumentException("Élève introuvable."));
        LocalDateTime now = LocalDateTime.now();
        codeRepository.findByEleveIdAndUsedAtIsNull(eleveId).forEach(existing -> {
            existing.setUsedAt(now);
            codeRepository.save(existing);
        });

        String plainCode = generateCode();
        LocalDateTime expiresAt = now.plus(CODE_LIFETIME);
        codeRepository.save(ParentActivationCode.builder()
                .eleveId(eleve.getId())
                .codeHash(passwordEncoder.encode(plainCode))
                .expiresAt(expiresAt)
                .build());
        return new IssuedCode(plainCode, expiresAt);
    }

    @Transactional
    public ActivationOutcome activate(String rawMatricule, String rawCode, String password) {
        String matricule = matriculeService.normalize(rawMatricule);
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase();
        if (!matriculeService.isValidFormat(matricule)
                || code.length() != 10
                || !PasswordPolicy.isValid(password)) {
            return ActivationOutcome.failure(false);
        }

        Eleve eleve = eleveRepository.findByMatriculeIgnoreCase(matricule).orElse(null);
        if (eleve == null) return ActivationOutcome.failure(false);

        ParentActivationCode activation = codeRepository
                .findFirstByEleveIdAndUsedAtIsNullOrderByCreatedAtDesc(eleve.getId())
                .orElse(null);
        LocalDateTime now = LocalDateTime.now();
        if (activation == null || activation.getExpiresAt().isBefore(now)) {
            return ActivationOutcome.failure(false);
        }
        if (activation.getLockedUntil() != null && activation.getLockedUntil().isAfter(now)) {
            return ActivationOutcome.failure(true);
        }

        if (!passwordEncoder.matches(code, activation.getCodeHash())) {
            int attempts = activation.getFailedAttempts() + 1;
            activation.setFailedAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                activation.setLockedUntil(now.plus(LOCK_DURATION));
            }
            codeRepository.save(activation);
            return ActivationOutcome.failure(attempts >= MAX_FAILED_ATTEMPTS);
        }

        String email = parentEmail(eleve);
        User parent = userRepository.findByEmail(email).orElseGet(() -> User.builder()
                .nom(eleve.getNom())
                .prenom("Parent de " + eleve.getPrenom())
                .email(email)
                .role(Role.PARENT)
                .eleveId(eleve.getId())
                .actif(true)
                .build());
        if (parent.getRole() != Role.PARENT
                || (parent.getEleveId() != null && !parent.getEleveId().equals(eleve.getId()))) {
            return ActivationOutcome.failure(false);
        }

        parent.setEleveId(eleve.getId());
        parent.setMotDePasse(passwordEncoder.encode(password));
        parent.setParentCredentialsActivated(true);
        parent.setActif(true);
        User saved = userRepository.save(parent);

        activation.setUsedAt(now);
        activation.setCodeHash("USED");
        codeRepository.save(activation);
        return ActivationOutcome.success(saved);
    }

    public String parentEmail(Eleve eleve) {
        return "parent." + eleve.getMatricule().toLowerCase() + "@ska.local";
    }

    private static String generateCode() {
        StringBuilder code = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            code.append(CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }

    public record IssuedCode(String code, LocalDateTime expiresAt) {
    }

    public record ActivationOutcome(boolean success, boolean locked, User user) {
        static ActivationOutcome success(User user) {
            return new ActivationOutcome(true, false, user);
        }

        static ActivationOutcome failure(boolean locked) {
            return new ActivationOutcome(false, locked, null);
        }
    }
}
