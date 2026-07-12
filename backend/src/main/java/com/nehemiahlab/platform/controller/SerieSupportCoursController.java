package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.ModuleCours;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.SerieSupportCours;
import com.nehemiahlab.platform.model.SupportCoursFichier;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.ModuleCoursRepository;
import com.nehemiahlab.platform.repository.SerieSupportCoursRepository;
import com.nehemiahlab.platform.security.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/series-supports-cours")
public class SerieSupportCoursController {

    @Autowired
    private SerieSupportCoursRepository serieRepository;

    @Autowired
    private ModuleCoursRepository moduleCoursRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<SerieSupportCours>> list(
            @RequestParam(required = false) Long moduleId,
            Authentication auth
    ) {
        User user = (User) auth.getPrincipal();
        boolean director = user.getRole() == Role.DIRECTEUR;

        if (moduleId != null) {
            return ResponseEntity.ok(serieRepository.findByModuleId(moduleId, director));
        }
        List<SerieSupportCours> series = director
                ? serieRepository.findAllByOrderByOrdreAscTitreAsc()
                : serieRepository.findAllActiveForFormateurs();
        return ResponseEntity.ok(series);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> getOne(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        Optional<SerieSupportCours> opt = serieRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        SerieSupportCours serie = opt.get();
        if (!serie.isActif() && user.getRole() != Role.DIRECTEUR) {
            return ResponseEntity.notFound().build();
        }
        if (user.getRole() != Role.DIRECTEUR) {
            boolean hasActiveModule = serie.getModules().stream().anyMatch(ModuleCours::isActif);
            if (!hasActiveModule) return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(serie);
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String titre = cleanRequired(body.get("titre"));
        if (titre == null || titre.isBlank()) {
            return badField("titre", "Le titre de la série est obligatoire.");
        }
        Set<ModuleCours> modules = resolveModules(body.get("moduleIds"));
        if (modules.isEmpty()) {
            return badField("moduleIds", "Sélectionnez au moins un module SKA.");
        }

        SerieSupportCours serie = SerieSupportCours.builder()
                .titre(titre)
                .description(cleanOptional(body.get("description")))
                .ordre(parseOrdre(body.get("ordre")))
                .actif(parseActif(body.get("actif")))
                .modules(modules)
                .build();
        return ResponseEntity.ok(serieRepository.save(serie));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<SerieSupportCours> opt = serieRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        SerieSupportCours serie = opt.get();

        if (body.containsKey("titre")) {
            String titre = cleanRequired(body.get("titre"));
            if (titre == null || titre.isBlank()) {
                return badField("titre", "Le titre de la série est obligatoire.");
            }
            serie.setTitre(titre);
        }
        if (body.containsKey("description")) {
            serie.setDescription(cleanOptional(body.get("description")));
        }
        if (body.containsKey("ordre")) {
            serie.setOrdre(parseOrdre(body.get("ordre")));
        }
        if (body.containsKey("actif")) {
            serie.setActif(parseActif(body.get("actif")));
        }
        if (body.containsKey("moduleIds")) {
            Set<ModuleCours> modules = resolveModules(body.get("moduleIds"));
            if (modules.isEmpty()) {
                return badField("moduleIds", "Sélectionnez au moins un module SKA.");
            }
            serie.setModules(modules);
        }

        return ResponseEntity.ok(serieRepository.save(serie));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!serieRepository.existsById(id)) return ResponseEntity.notFound().build();
        serieRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Série de supports supprimée."));
    }

    @PostMapping(value = "/{id}/fichiers", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> uploadFichiers(
            @PathVariable Long id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) MultipartFile[] files
    ) {
        Optional<SerieSupportCours> opt = serieRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        List<MultipartFile> allFiles = collectFiles(file, files);
        if (allFiles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fichier manquant."));
        }

        try {
            SerieSupportCours serie = opt.get();
            for (MultipartFile f : allFiles) {
                SavedFile saved = saveSupportFile(f);
                serie.addFichier(SupportCoursFichier.builder()
                        .url(saved.url())
                        .nom(saved.originalName())
                        .mimeType(f.getContentType())
                        .build());
            }
            return ResponseEntity.ok(serieRepository.save(serie));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Erreur lors de l'upload du support."));
        }
    }

    @DeleteMapping("/{id}/fichiers/{fichierId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> deleteFichier(@PathVariable Long id, @PathVariable Long fichierId) {
        Optional<SerieSupportCours> opt = serieRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        SerieSupportCours serie = opt.get();

        SupportCoursFichier target = serie.getFichiers().stream()
                .filter(f -> fichierId.equals(f.getId()))
                .findFirst()
                .orElse(null);
        if (target == null) return ResponseEntity.notFound().build();

        serie.removeFichier(target);
        return ResponseEntity.ok(serieRepository.save(serie));
    }

    private Set<ModuleCours> resolveModules(Object raw) {
        if (raw == null) return Set.of();
        List<Long> ids = new ArrayList<>();
        if (raw instanceof Collection<?> col) {
            for (Object item : col) {
                if (item != null && !item.toString().isBlank()) {
                    ids.add(Long.parseLong(item.toString()));
                }
            }
        }
        if (ids.isEmpty()) return Set.of();
        return new HashSet<>(moduleCoursRepository.findAllById(ids));
    }

    private record SavedFile(String url, String originalName) {}

    private SavedFile saveSupportFile(MultipartFile file) throws Exception {
        if (file.getSize() > 100L * 1024 * 1024) {
            throw new IllegalArgumentException("Chaque fichier ne doit pas dépasser 100 Mo.");
        }
        String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')).toLowerCase() : "";
        Path uploadDir = Paths.get("uploads", "supports-cours");
        if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
        String filename = "support-" + UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return new SavedFile("/uploads/supports-cours/" + filename, original);
    }

    private List<MultipartFile> collectFiles(MultipartFile single, MultipartFile[] many) {
        List<MultipartFile> all = new ArrayList<>();
        if (single != null && !single.isEmpty()) all.add(single);
        if (many != null) {
            for (MultipartFile f : many) {
                if (f != null && !f.isEmpty()) all.add(f);
            }
        }
        return all;
    }

    private static int parseOrdre(Object raw) {
        if (raw == null || raw.toString().isBlank()) return 0;
        return Integer.parseInt(raw.toString());
    }

    private static boolean parseActif(Object raw) {
        if (raw == null) return true;
        return Boolean.parseBoolean(raw.toString());
    }

    private static String cleanRequired(Object raw) {
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
