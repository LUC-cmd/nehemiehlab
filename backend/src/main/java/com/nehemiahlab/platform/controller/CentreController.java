package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.service.CentreAccessService;
import com.nehemiahlab.platform.service.CentreExcelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @Autowired
    private CentreExcelService centreExcelService;

    @Autowired
    private CentreAccessService centreAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<Centre>> getAll(Authentication auth) {
        return ResponseEntity.ok(centreAccessService.accessibleCentres((User) auth.getPrincipal()));
    }

    @GetMapping("/mes-centres")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<List<Centre>> getMesCentres(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(centreAccessService.accessibleCentres(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<Centre> getById(@PathVariable Long id, Authentication auth) {
        centreAccessService.requireCentreAccess((User) auth.getPrincipal(), id);
        return centreRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<Centre> create(@RequestBody Centre centre) {
        centre.setTelephoneResponsable(cleanPhone(centre.getTelephoneResponsable()));
        centre.setTelephoneCoordinateur(cleanPhone(centre.getTelephoneCoordinateur()));
        centre.setTelephoneFormateur(cleanPhone(centre.getTelephoneFormateur()));
        if (centre.getCoordinateurNom() != null) {
            centre.setCoordinateurNom(centre.getCoordinateurNom().trim());
        }
        if (centre.getCoordinateurPrenom() != null) {
            centre.setCoordinateurPrenom(centre.getCoordinateurPrenom().trim());
        }
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
                    centre.setRegion(updateData.getRegion());
                    centre.setCluster(updateData.getCluster());
                    centre.setLatitude(updateData.getLatitude());
                    centre.setLongitude(updateData.getLongitude());
                    if (updateData.getCodeCdej() != null) {
                        centre.setCodeCdej(updateData.getCodeCdej().isBlank() ? null : updateData.getCodeCdej().trim());
                    }
                    if (updateData.getTelephoneResponsable() != null) {
                        centre.setTelephoneResponsable(cleanPhone(updateData.getTelephoneResponsable()));
                    }
                    if (updateData.getTelephoneCoordinateur() != null) {
                        centre.setTelephoneCoordinateur(cleanPhone(updateData.getTelephoneCoordinateur()));
                    }
                    if (updateData.getTelephoneFormateur() != null) {
                        centre.setTelephoneFormateur(cleanPhone(updateData.getTelephoneFormateur()));
                    }
                    if (updateData.getCoordinateurNom() != null) {
                        centre.setCoordinateurNom(updateData.getCoordinateurNom().trim());
                    }
                    if (updateData.getCoordinateurPrenom() != null) {
                        centre.setCoordinateurPrenom(updateData.getCoordinateurPrenom().trim());
                    }
                    return ResponseEntity.ok(centreRepository.save(centre));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private static String cleanPhone(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        return digits.isBlank() ? null : digits;
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

        // Un centre = un seul formateur ; un formateur peut couvrir plusieurs centres
        boolean alreadyAssigned = centre.getFormateurs().stream()
                .anyMatch(f -> f.getId().equals(formateur.getId()));
        if (alreadyAssigned) {
            return ResponseEntity.ok(Map.of("message", "Ce formateur est déjà assigné à ce centre."));
        }
        if (!centre.getFormateurs().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ce centre a déjà un formateur. Retirez-le avant d'en assigner un autre."
            ));
        }

        centre.getFormateurs().add(formateur);
        if (formateur.getCentres() == null) {
            formateur.setCentres(new java.util.HashSet<>());
        }
        formateur.getCentres().add(centre);
        centreRepository.save(centre);
        userRepository.save(formateur);

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
        if (formateur.getCentres() != null) {
            formateur.getCentres().removeIf(c -> c.getId().equals(centreId));
        }
        centreRepository.save(centre);
        userRepository.save(formateur);

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
        User coordinateur = userOpt.get();
        List<Centre> existing = centreRepository.findByCoordinateur(coordinateur);
        if (existing.stream().anyMatch(c -> !c.getId().equals(centreId))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ce coordinateur est déjà affecté à un autre centre."
            ));
        }

        centre.setCoordinateur(coordinateur);
        centreRepository.save(centre);

        return ResponseEntity.ok(Map.of("message", "Coordinateur assigné avec succès."));
    }

    @PostMapping("/{id}/localisation-courante")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> updateLocalisationCourante(@PathVariable Long id, @RequestBody Map<String, Double> body, Authentication auth) {
        Optional<Centre> centreOpt = centreRepository.findById(id);
        if (centreOpt.isEmpty()) return ResponseEntity.notFound().build();
        User user = (User) auth.getPrincipal();
        Centre centre = centreOpt.get();
        centreAccessService.requireCentreAccess(user, id);

        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Latitude et longitude sont requises."));
        }
        centre.setLatitude(lat);
        centre.setLongitude(lng);
        return ResponseEntity.ok(centreRepository.save(centre));
    }

    /** Export Excel : centres + eleves + contacts (backup / reinitialisation). */
    @GetMapping("/export-excel")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<byte[]> exportExcel() {
        try {
            byte[] bytes = centreExcelService.exportWorkbook();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ska_centres_eleves.xlsx")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Import Excel : recree/maj centres, eleves, coordinateurs et numeros. */
    @PostMapping(value = "/import-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> importExcel(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(centreExcelService.importWorkbook(file));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Erreur lors de l'import Excel : " + e.getMessage()
            ));
        }
    }
}
