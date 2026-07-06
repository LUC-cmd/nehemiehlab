package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.ModuleFormation;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.ModuleFormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/formations")
public class ModuleFormationController {

    @Autowired
    private ModuleFormationRepository moduleFormationRepository;

    @PostMapping
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        
        @SuppressWarnings("unchecked")
        List<Integer> elevesInt = (List<Integer>) body.get("elevesPresents");
        List<Long> elevesPresents = elevesInt.stream().map(Integer::longValue).toList();

        ModuleFormation formation = ModuleFormation.builder()
                .date(LocalDate.parse(body.get("date").toString()))
                .centreId(Long.valueOf(body.get("centreId").toString()))
                .formateurId(formateur.getId())
                .titre(body.get("titre").toString())
                .description(body.get("description").toString())
                .dureeHeures(Double.valueOf(body.get("dureeHeures").toString()))
                .elevesPresents(elevesPresents)
                .build();

        return ResponseEntity.ok(moduleFormationRepository.save(formation));
    }

    @GetMapping("/centre/{centreId}")
    public ResponseEntity<List<ModuleFormation>> getByCentre(@PathVariable Long centreId) {
        return ResponseEntity.ok(moduleFormationRepository.findByCentreIdOrderByDateDesc(centreId));
    }

    @GetMapping("/mes-formations")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<List<ModuleFormation>> getMesFormations(Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        return ResponseEntity.ok(moduleFormationRepository.findByFormateurIdOrderByDateDesc(formateur.getId()));
    }
}
