package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.FormateurEvaluation;
import com.nehemiahlab.platform.model.ModuleCours;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.FormateurEvaluationRepository;
import com.nehemiahlab.platform.repository.ModuleCoursRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.SecureFileStorage;
import com.nehemiahlab.platform.service.ModuleCoursService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/formateur-evaluations")
public class FormateurEvaluationController {

    private static final long MAX_SCRATCH_BYTES = 25L * 1024 * 1024;

    @Autowired
    private FormateurEvaluationRepository evaluationRepository;

    @Autowired
    private ModuleCoursRepository moduleCoursRepository;

    @Autowired
    private ModuleCoursService moduleCoursService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR')")
    public ResponseEntity<List<FormateurEvaluation>> list(
            @RequestParam(required = false) Long formateurId,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<FormateurEvaluation> list;
        if (user.getRole() == Role.FORMATEUR) {
            list = evaluationRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId());
        } else if (formateurId != null) {
            list = evaluationRepository.findByFormateurIdOrderByCreatedAtDesc(formateurId);
        } else {
            list = evaluationRepository.findAllByOrderByCreatedAtDesc();
        }
        enrich(list);
        return ResponseEntity.ok(list);
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> submit(
            @RequestParam Long moduleCoursId,
            @RequestParam Integer quizScore,
            @RequestParam Integer quizTotal,
            @RequestParam(required = false) String quizReponses,
            @RequestParam(required = false) String analyse,
            @RequestParam(required = false) MultipartFile scratchFile,
            Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        ModuleCours module = moduleCoursService.requireActive(moduleCoursId);

        if (quizTotal == null || quizTotal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le quiz est obligatoire."));
        }
        if (analyse == null || analyse.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'analyse pédagogique est obligatoire."));
        }

        String scratchUrl = null;
        String scratchNom = null;
        if (scratchFile != null && !scratchFile.isEmpty()) {
            String original = scratchFile.getOriginalFilename() != null
                    ? scratchFile.getOriginalFilename() : "projet.sb3";
            if (!original.toLowerCase().endsWith(".sb3")) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Le projet Scratch doit être un fichier .sb3"));
            }
            try {
                scratchUrl = secureFileStorage.store(
                        scratchFile, "formateur-scratch", "media", MAX_SCRATCH_BYTES, "scratch");
                scratchNom = original;
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(Map.of(
                        "message", "Erreur lors de l'upload du projet Scratch."));
            }
        }

        FormateurEvaluation evaluation = FormateurEvaluation.builder()
                .formateurId(formateur.getId())
                .moduleCoursId(module.getId())
                .quizScore(Math.max(0, quizScore != null ? quizScore : 0))
                .quizTotal(quizTotal)
                .quizReponses(InputSanitizer.cleanNullable(quizReponses))
                .scratchUrl(scratchUrl)
                .scratchNom(scratchNom)
                .analyse(InputSanitizer.clean(analyse))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        FormateurEvaluation saved = evaluationRepository.save(evaluation);
        enrich(List.of(saved));
        return ResponseEntity.ok(saved);
    }

    private void enrich(List<FormateurEvaluation> evaluations) {
        if (evaluations == null || evaluations.isEmpty()) return;
        Set<Long> formateurIds = evaluations.stream()
                .map(FormateurEvaluation::getFormateurId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> moduleIds = evaluations.stream()
                .map(FormateurEvaluation::getModuleCoursId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, User> users = new HashMap<>();
        userRepository.findAllById(formateurIds).forEach(u -> users.put(u.getId(), u));
        Map<Long, ModuleCours> modules = new HashMap<>();
        moduleCoursRepository.findAllById(moduleIds).forEach(m -> modules.put(m.getId(), m));

        for (FormateurEvaluation ev : evaluations) {
            User u = users.get(ev.getFormateurId());
            if (u != null) {
                ev.setFormateurNom(u.getNom());
                ev.setFormateurPrenom(u.getPrenom());
            }
            ModuleCours mod = modules.get(ev.getModuleCoursId());
            if (mod != null) {
                ev.setModuleTitre(mod.getTitre());
            }
        }
    }
}
