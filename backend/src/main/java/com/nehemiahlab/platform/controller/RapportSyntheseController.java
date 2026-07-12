package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.RapportSyntheseCentre;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.RapportSyntheseCentreRepository;
import com.nehemiahlab.platform.service.CentreAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/rapports/synthese")
@PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
public class RapportSyntheseController {

    @Autowired
    private RapportSyntheseCentreRepository repository;

    @Autowired
    private CentreAccessService centreAccessService;

    @GetMapping("/centre/{centreId}")
    public ResponseEntity<?> getSynthese(
            @PathVariable Long centreId,
            @RequestParam(defaultValue = "Module 01 : Apprendre à coder avec Scratch") String moduleLabel,
            @RequestParam String debut,
            @RequestParam String fin,
            Authentication auth
    ) {
        centreAccessService.requireCentreAccess((User) auth.getPrincipal(), centreId);
        LocalDate debutDate = LocalDate.parse(debut);
        LocalDate finDate = LocalDate.parse(fin);
        Optional<RapportSyntheseCentre> opt = repository
                .findByCentreIdAndModuleLabelAndDateDebutAndDateFin(centreId, moduleLabel, debutDate, finDate);
        if (opt.isPresent()) {
            return ResponseEntity.ok(opt.get());
        }
        return ResponseEntity.ok(Map.of(
                "centreId", centreId,
                "moduleLabel", moduleLabel,
                "dateDebut", debut,
                "dateFin", fin,
                "annee", finDate.getYear(),
                "empty", true
        ));
    }

    @PutMapping("/centre/{centreId}")
    public ResponseEntity<?> saveSynthese(
            @PathVariable Long centreId,
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        User user = (User) auth.getPrincipal();
        centreAccessService.requireCentreAccess(user, centreId);

        String moduleLabel = body.get("moduleLabel") != null
                ? body.get("moduleLabel").toString()
                : "Module 01 : Apprendre à coder avec Scratch";

        if (body.get("dateDebut") == null || body.get("dateFin") == null
                || body.get("dateDebut").toString().isBlank() || body.get("dateFin").toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Les dates de début et de fin de période sont obligatoires pour le rapport."
            ));
        }
        LocalDate debutDate = LocalDate.parse(body.get("dateDebut").toString());
        LocalDate finDate = LocalDate.parse(body.get("dateFin").toString());
        if (finDate.isBefore(debutDate)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "La date de fin doit être postérieure à la date de début."
            ));
        }

        RapportSyntheseCentre synth = repository
                .findByCentreIdAndModuleLabelAndDateDebutAndDateFin(centreId, moduleLabel, debutDate, finDate)
                .orElse(RapportSyntheseCentre.builder()
                        .centreId(centreId)
                        .moduleLabel(moduleLabel)
                        .annee(finDate.getYear())
                        .dateDebut(debutDate)
                        .dateFin(finDate)
                        .build());

        synth.setDateDebut(debutDate);
        synth.setDateFin(finDate);
        synth.setAnnee(finDate.getYear());
        applyInt(body, "effectifDebutFilles", synth::setEffectifDebutFilles);
        applyInt(body, "effectifDebutGarcons", synth::setEffectifDebutGarcons);
        applyInt(body, "effectifFinalFilles", synth::setEffectifFinalFilles);
        applyInt(body, "effectifFinalGarcons", synth::setEffectifFinalGarcons);
        applyInt(body, "projetsLibresP1", synth::setProjetsLibresP1);
        applyInt(body, "projetsLibresP2", synth::setProjetsLibresP2);
        applyInt(body, "projetsNonAcheves", synth::setProjetsNonAcheves);
        applyInt(body, "projetsGroupe", synth::setProjetsGroupe);
        applyInt(body, "projetsContextuels", synth::setProjetsContextuels);
        applyInt(body, "projetsPresentes", synth::setProjetsPresentes);

        applyText(body, "syntheseTable", synth::setSyntheseTable);
        applyText(body, "aime", synth::setAime);
        applyText(body, "pasAime", synth::setPasAime);
        applyText(body, "vision", synth::setVision);

        synth.setFormateurId(user.getId());
        synth.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repository.save(synth));
    }

    private void applyInt(Map<String, Object> body, String key, java.util.function.Consumer<Integer> setter) {
        if (body.containsKey(key) && body.get(key) != null && !body.get(key).toString().isBlank()) {
            setter.accept(Integer.valueOf(body.get(key).toString()));
        }
    }

    private void applyText(Map<String, Object> body, String key, java.util.function.Consumer<String> setter) {
        if (body.containsKey(key)) {
            Object v = body.get(key);
            setter.accept(v == null ? null : v.toString());
        }
    }
}
