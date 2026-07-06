package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/centres")
public class CentreController {

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Centre>> getAll() {
        return ResponseEntity.ok(centreRepository.findAll());
    }

    @GetMapping("/mes-centres")
    public ResponseEntity<List<Centre>> getMesCentres(Authentication auth) {
        User user = (User) auth.getPrincipal();
        if (user.getRole() == Role.COORDINATEUR) {
            return ResponseEntity.ok(centreRepository.findByCoordinateur(user));
        } else if (user.getRole() == Role.FORMATEUR) {
            return ResponseEntity.ok(centreRepository.findByFormateurId(user.getId()));
        }
        return ResponseEntity.ok(centreRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Centre> getById(@PathVariable Long id) {
        return centreRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<Centre> create(@RequestBody Centre centre) {
        return ResponseEntity.ok(centreRepository.save(centre));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<Centre> update(@PathVariable Long id, @RequestBody Centre updateData) {
        return centreRepository.findById(id)
                .map(centre -> {
                    centre.setNom(updateData.getNom());
                    centre.setAdresse(updateData.getAdresse());
                    centre.setVille(updateData.getVille());
                    return ResponseEntity.ok(centreRepository.save(centre));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return centreRepository.findById(id)
                .map(centre -> {
                    centreRepository.delete(centre);
                    return ResponseEntity.ok(Map.of("message", "Centre supprimé."));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{centreId}/formateurs/{formateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> assignerFormateur(@PathVariable Long centreId, @PathVariable Long formateurId) {
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        Optional<User> userOpt = userRepository.findById(formateurId);

        if (centreOpt.isEmpty() || userOpt.isEmpty() || userOpt.get().getRole() != Role.FORMATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Données invalides."));
        }

        Centre centre = centreOpt.get();
        User formateur = userOpt.get();

        if (!centre.getFormateurs().contains(formateur)) {
            centre.getFormateurs().add(formateur);
            centreRepository.save(centre);
        }

        return ResponseEntity.ok(Map.of("message", "Formateur assigné avec succès."));
    }

    @DeleteMapping("/{centreId}/formateurs/{formateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> retirerFormateur(@PathVariable Long centreId, @PathVariable Long formateurId) {
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        Optional<User> userOpt = userRepository.findById(formateurId);

        if (centreOpt.isEmpty() || userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Données invalides."));
        }

        Centre centre = centreOpt.get();
        User formateur = userOpt.get();

        centre.getFormateurs().remove(formateur);
        centreRepository.save(centre);

        return ResponseEntity.ok(Map.of("message", "Formateur retiré du centre."));
    }

    @PutMapping("/{centreId}/coordinateur/{coordinateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> assignerCoordinateur(@PathVariable Long centreId, @PathVariable Long coordinateurId) {
        Optional<Centre> centreOpt = centreRepository.findById(centreId);
        Optional<User> userOpt = userRepository.findById(coordinateurId);

        if (centreOpt.isEmpty() || userOpt.isEmpty() || userOpt.get().getRole() != Role.COORDINATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Données invalides."));
        }

        Centre centre = centreOpt.get();
        centre.setCoordinateur(userOpt.get());
        centreRepository.save(centre);

        return ResponseEntity.ok(Map.of("message", "Coordinateur assigné avec succès."));
    }
}
