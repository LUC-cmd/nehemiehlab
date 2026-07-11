package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.ModuleFormation;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.ModuleFormationRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.service.CentreAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/formations")
public class ModuleFormationController {

    @Autowired
    private ModuleFormationRepository moduleFormationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @PostMapping
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User formateur = (User) auth.getPrincipal();

        Long centreId = Long.valueOf(body.get("centreId").toString());
        centreAccessService.requireCentreAccess(formateur, centreId);

        @SuppressWarnings("unchecked")
        List<Object> elevesRaw = (List<Object>) body.get("elevesPresents");
        List<Long> elevesPresents = elevesRaw == null
                ? List.of()
                : elevesRaw.stream().map(value -> Long.valueOf(value.toString())).distinct().toList();
        boolean containsAnotherCentre = eleveRepository.findAllById(elevesPresents).stream()
                .anyMatch(eleve -> eleve.getCentre() == null || !centreId.equals(eleve.getCentre().getId()));
        if (containsAnotherCentre || eleveRepository.findAllById(elevesPresents).size() != elevesPresents.size()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "La liste contient un élève absent ou rattaché à un autre centre."));
        }

        ModuleFormation formation = ModuleFormation.builder()
                .date(LocalDate.parse(body.get("date").toString()))
                .centreId(centreId)
                .formateurId(formateur.getId())
                .titre(InputSanitizer.clean(body.get("titre").toString()))
                .description(body.get("description") != null
                        ? InputSanitizer.clean(body.get("description").toString()) : "")
                .dureeHeures(Double.valueOf(body.get("dureeHeures").toString()))
                .elevesPresents(elevesPresents)
                .build();

        ModuleFormation saved = moduleFormationRepository.save(formation);
        enrich(List.of(saved));
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/centre/{centreId}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<ModuleFormation>> getByCentre(
            @PathVariable Long centreId,
            @RequestParam(required = false) Long formateurId,
            Authentication auth
    ) {
        centreAccessService.requireCentreAccess((User) auth.getPrincipal(), centreId);
        List<ModuleFormation> list = moduleFormationRepository.findByCentreIdOrderByDateDesc(centreId);
        if (formateurId != null) {
            list = list.stream().filter(f -> Objects.equals(f.getFormateurId(), formateurId)).toList();
        }
        enrich(list);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/mes-formations")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<List<ModuleFormation>> getMesFormations(Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        List<ModuleFormation> list = moduleFormationRepository.findByFormateurIdOrderByDateDesc(formateur.getId());
        enrich(list);
        return ResponseEntity.ok(list);
    }

    private void enrich(List<ModuleFormation> formations) {
        if (formations == null || formations.isEmpty()) return;
        Set<Long> ids = formations.stream()
                .map(ModuleFormation::getFormateurId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> byId = new HashMap<>();
        for (User u : userRepository.findAllById(ids)) {
            byId.put(u.getId(), u);
        }
        for (ModuleFormation f : formations) {
            User u = byId.get(f.getFormateurId());
            if (u != null) {
                f.setFormateurNom(u.getNom());
                f.setFormateurPrenom(u.getPrenom());
            }
        }
    }
}
