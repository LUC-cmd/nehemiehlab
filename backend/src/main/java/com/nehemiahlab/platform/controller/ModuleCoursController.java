package com.nehemiahlab.platform.controller;



import com.nehemiahlab.platform.model.ModuleCours;

import com.nehemiahlab.platform.model.Role;

import com.nehemiahlab.platform.model.User;

import com.nehemiahlab.platform.repository.ModuleCoursRepository;

import com.nehemiahlab.platform.security.InputSanitizer;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.ResponseEntity;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;



import java.util.Map;

import java.util.Optional;



@RestController

@RequestMapping("/modules-cours")

public class ModuleCoursController {



    @Autowired

    private ModuleCoursRepository moduleCoursRepository;



    @GetMapping

    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")

    public ResponseEntity<java.util.List<ModuleCours>> list(Authentication auth) {

        User user = (User) auth.getPrincipal();

        java.util.List<ModuleCours> modules = user.getRole() == Role.DIRECTEUR

                ? moduleCoursRepository.findAllByOrderByNumeroOrdreAscTitreAsc()

                : moduleCoursRepository.findByActifTrueOrderByNumeroOrdreAscTitreAsc();

        return ResponseEntity.ok(modules);

    }



    @GetMapping("/{id}")

    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")

    public ResponseEntity<?> getOne(@PathVariable Long id, Authentication auth) {

        User user = (User) auth.getPrincipal();

        Optional<ModuleCours> opt = moduleCoursRepository.findById(id);

        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        ModuleCours module = opt.get();

        if (!module.isActif() && user.getRole() != Role.DIRECTEUR) {

            return ResponseEntity.notFound().build();

        }

        return ResponseEntity.ok(module);

    }



    @PostMapping

    @PreAuthorize("hasRole('DIRECTEUR')")

    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {

        String titre = cleanRequired(body.get("titre"), "Le titre est obligatoire.");

        if (titre == null) return badField("titre", "Le titre est obligatoire.");



        ModuleCours module = ModuleCours.builder()

                .numeroOrdre(parseOrdre(body.get("numeroOrdre")))

                .titre(titre)

                .description(cleanOptional(body.get("description")))

                .objectifs(cleanOptional(body.get("objectifs")))

                .dureeRecommandeeHeures(parseDouble(body.get("dureeRecommandeeHeures")))

                .niveau(cleanOptional(body.get("niveau")))

                .actif(parseActif(body.get("actif")))

                .build();



        return ResponseEntity.ok(moduleCoursRepository.save(module));

    }



    @PutMapping("/{id}")

    @PreAuthorize("hasRole('DIRECTEUR')")

    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {

        Optional<ModuleCours> opt = moduleCoursRepository.findById(id);

        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        ModuleCours module = opt.get();



        if (body.containsKey("numeroOrdre")) {

            module.setNumeroOrdre(parseOrdre(body.get("numeroOrdre")));

        }

        if (body.containsKey("titre")) {

            String titre = cleanRequired(body.get("titre"), null);

            if (titre == null || titre.isBlank()) {

                return badField("titre", "Le titre est obligatoire.");

            }

            module.setTitre(titre);

        }

        if (body.containsKey("description")) module.setDescription(cleanOptional(body.get("description")));

        if (body.containsKey("objectifs")) module.setObjectifs(cleanOptional(body.get("objectifs")));

        if (body.containsKey("dureeRecommandeeHeures")) {

            module.setDureeRecommandeeHeures(parseDouble(body.get("dureeRecommandeeHeures")));

        }

        if (body.containsKey("niveau")) module.setNiveau(cleanOptional(body.get("niveau")));

        if (body.containsKey("actif")) module.setActif(parseActif(body.get("actif")));



        return ResponseEntity.ok(moduleCoursRepository.save(module));

    }



    @DeleteMapping("/{id}")

    @PreAuthorize("hasRole('DIRECTEUR')")

    public ResponseEntity<?> delete(@PathVariable Long id) {

        if (!moduleCoursRepository.existsById(id)) return ResponseEntity.notFound().build();

        moduleCoursRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", "Module supprimé."));

    }



    private static int parseOrdre(Object raw) {

        if (raw == null || raw.toString().isBlank()) return 0;

        return Integer.parseInt(raw.toString());

    }



    private static Double parseDouble(Object raw) {

        if (raw == null || raw.toString().isBlank()) return null;

        return Double.valueOf(raw.toString());

    }



    private static boolean parseActif(Object raw) {

        if (raw == null) return true;

        return Boolean.parseBoolean(raw.toString());

    }



    private static String cleanRequired(Object raw, String ignored) {

        if (raw == null) return null;

        return InputSanitizer.clean(raw.toString()).trim();

    }



    private static String cleanOptional(Object raw) {

        if (raw == null) return "";

        return InputSanitizer.clean(raw.toString());

    }



    private static ResponseEntity<Map<String, String>> badField(String field, String message) {

        return ResponseEntity.badRequest().body(Map.of("message", message, "field", field));

    }

}

