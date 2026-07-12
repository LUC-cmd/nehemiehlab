package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.EvaluationSession;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.EvaluationSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/parent")
public class ParentController {

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private EvaluationSessionRepository evaluationSessionRepository;

    @GetMapping("/mon-enfant")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<?> monEnfant(Authentication auth) {
        User parent = (User) auth.getPrincipal();
        if (parent.getEleveId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Aucun enfant lié à ce compte parent."
            ));
        }

        Optional<Eleve> eleveOpt = eleveRepository.findById(parent.getEleveId());
        if (eleveOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Eleve e = eleveOpt.get();
        Double perf = computePerformance(e.getId());

        Map<String, Object> body = new HashMap<>();
        body.put("id", e.getId());
        body.put("nom", e.getNom());
        body.put("prenom", e.getPrenom());
        body.put("matricule", e.getMatricule());
        body.put("age", e.getAge());
        body.put("sexe", e.getSexe());
        body.put("classe", e.getClasse());
        body.put("centre", e.getCentre() != null ? e.getCentre().getNom() : null);
        body.put("dateDebutFormation", e.getDateDebutFormation());
        body.put("totalHeures", e.getTotalHeures());
        body.put("performanceMoyenne", perf);
        if (e.getProjet() != null) {
            body.put("projet", Map.of(
                    "nom", e.getProjet().getNom() != null ? e.getProjet().getNom() : "",
                    "description", e.getProjet().getDescription() != null ? e.getProjet().getDescription() : "",
                    "evolution", e.getProjet().getEvolution() != null ? e.getProjet().getEvolution() : 0
            ));
        } else {
            body.put("projet", null);
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/seances")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<?> seancesEnfant(Authentication auth) {
        User parent = (User) auth.getPrincipal();
        if (parent.getEleveId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Aucun enfant lié à ce compte parent."
            ));
        }

        List<Map<String, Object>> seances = evaluationSessionRepository.findByEleveId(parent.getEleveId())
                .stream()
                .filter(ev -> ev.getSessionCours() != null)
                .sorted(Comparator.comparing(
                        (EvaluationSession ev) -> ev.getSessionCours().getHeureDebut(),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(ev -> {
                    var s = ev.getSessionCours();
                    Map<String, Object> row = new HashMap<>();
                    row.put("sessionId", s.getId());
                    row.put("titre", s.getTitre());
                    row.put("module", s.getModuleFait());
                    row.put("centre", s.getCentre() != null ? s.getCentre().getNom() : null);
                    row.put("date", s.getHeureDebut());
                    row.put("statut", s.getStatut());
                    row.put("present", ev.isPresent());
                    row.put("note", ev.getNote());
                    row.put("commentaire", ev.getCommentaire());
                    row.put("projetTravaille", ev.getProjetTravaille());
                    row.put("projetFinal", ev.isProjetFinal());
                    row.put("projetProbleme", ev.getProjetProbleme());
                    row.put("projetSolution", ev.getProjetSolution());
                    row.put("heureArrivee", ev.getHeureArrivee());
                    row.put("dureeMinutes", ev.getDureeMinutes());
                    return row;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(seances);
    }

    private Double computePerformance(Long eleveId) {
        List<EvaluationSession> evals = evaluationSessionRepository.findByEleveId(eleveId);
        double total = 0;
        int count = 0;
        for (EvaluationSession eval : evals) {
            if (eval.getNote() != null) {
                total += eval.getNote();
                count++;
            }
        }
        if (count == 0) return null;
        return Math.round((total / count) * 10.0) / 10.0;
    }
}
