package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/sessions")
public class SessionController {

    @Autowired
    private SessionCoursRepository sessionCoursRepository;

    @Autowired
    private EvaluationSessionRepository evaluationSessionRepository;

    @Autowired
    private CentreRepository centreRepository;
    
    @Autowired
    private EleveRepository eleveRepository;

    @GetMapping
    public ResponseEntity<?> getSessions(Authentication auth) {
        User user = (User) auth.getPrincipal();
        List<SessionCours> sessions;

        if (user.getRole() == Role.FORMATEUR) {
            sessions = sessionCoursRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId());
        } else {
            sessions = sessionCoursRepository.findAllByOrderByCreatedAtDesc();
        }
        
        for (SessionCours session : sessions) {
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(session.getId());
            session.setNbTotalEleves((long) evals.size());
            session.setNbPresents(evals.stream().filter(EvaluationSession::isPresent).count());
        }

        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSessionById(@PathVariable Long id) {
        SessionCours session = sessionCoursRepository.findById(id).orElseThrow();
        List<EvaluationSession> evaluations = evaluationSessionRepository.findBySessionCoursId(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("session", session);
        response.put("evaluations", evaluations);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createSession(@RequestBody SessionCours request, Authentication auth) {
        User user = (User) auth.getPrincipal();
        
        SessionCours session = SessionCours.builder()
                .titre(request.getTitre())
                .dureePrevueMinutes(request.getDureePrevueMinutes())
                .heureDebut(LocalDateTime.now())
                .statut("EN_COURS")
                .centre(centreRepository.findById(request.getCentre().getId()).orElseThrow())
                .formateur(user)
                .build();
                
        sessionCoursRepository.save(session);
        
        // Créer les évaluations vides pour tous les élèves du centre
        List<Eleve> eleves = eleveRepository.findByCentreId(session.getCentre().getId());
        for (Eleve e : eleves) {
            EvaluationSession eval = EvaluationSession.builder()
                    .sessionCours(session)
                    .eleve(e)
                    .present(true)
                    .note(null)
                    .build();
            evaluationSessionRepository.save(eval);
        }
        
        return ResponseEntity.ok(session);
    }

    @PutMapping("/{id}/cloturer")
    public ResponseEntity<?> cloturerSession(@PathVariable Long id) {
        SessionCours session = sessionCoursRepository.findById(id).orElseThrow();
        if ("EN_COURS".equals(session.getStatut())) {
            session.setStatut("CLOTUREE");
            long duree = Duration.between(session.getHeureDebut(), LocalDateTime.now()).toMinutes();
            session.setDureeReelleMinutes(duree);
            sessionCoursRepository.save(session);
        }
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{id}/rapport")
    public ResponseEntity<?> uploadRapport(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        SessionCours session = sessionCoursRepository.findById(id).orElseThrow();
        try {
            Path uploadDir = Paths.get("uploads", "rapports");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;
            Path filePath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            String fileUrl = "/uploads/rapports/" + filename;
            session.setRapportUrl(fileUrl);
            sessionCoursRepository.save(session);
            
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du fichier"));
        }
    }

    @PutMapping("/{id}/evaluations")
    public ResponseEntity<?> updateEvaluations(@PathVariable Long id, @RequestBody List<EvaluationRequest> requests) {
        SessionCours session = sessionCoursRepository.findById(id).orElseThrow();
        if ("CLOTUREE".equals(session.getStatut())) {
            return ResponseEntity.badRequest().body("Session is already closed");
        }
        
        for (EvaluationRequest req : requests) {
            EvaluationSession eval = evaluationSessionRepository.findById(req.getId()).orElse(null);
            if (eval != null) {
                eval.setPresent(req.isPresent());
                eval.setNote(req.getNote());
                evaluationSessionRepository.save(eval);
            }
        }
        
        return ResponseEntity.ok("Evaluations updated");
    }
    
    @Data
    public static class EvaluationRequest {
        private Long id;
        private boolean present;
        private Double note;
    }
}
