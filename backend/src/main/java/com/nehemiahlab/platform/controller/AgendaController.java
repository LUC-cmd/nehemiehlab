package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.FormateurAgendaEntry;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.FormateurAgendaEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Agenda hebdomadaire du formateur : créneaux récurrents (jour de la
 * semaine + centre + horaires) que le formateur gère lui-même pour
 * visualiser et organiser ses semaines, indépendamment du démarrage
 * effectif d'une séance.
 */
@RestController
@RequestMapping("/agenda")
public class AgendaController {

    private static final DateTimeFormatter HHmm = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private FormateurAgendaEntryRepository agendaRepository;

    @Autowired
    private CentreRepository centreRepository;

    @GetMapping
    @PreAuthorize("hasRole('FORMATEUR')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getMine(Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        List<FormateurAgendaEntry> entries =
                agendaRepository.findByFormateurIdOrderByJourSemaineAscHeureDebutAsc(formateur.getId());
        return ResponseEntity.ok(entries.stream().map(this::toResponse).toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('FORMATEUR')")
    @Transactional
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User formateur = (User) auth.getPrincipal();

        Optional<Centre> centreOpt = resolveCentre(body.get("centreId"));
        if (centreOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
        }
        Centre centre = centreOpt.get();
        if (!appartientAuFormateur(centre, formateur)) {
            return ResponseEntity.status(403).body(Map.of("message", "Vous n'êtes pas rattaché à ce centre."));
        }

        Short jour = parseJour(body.get("jourSemaine"));
        if (jour == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Jour de la semaine invalide (1 à 7)."));
        }

        LocalTime debut = parseHeure(body.get("heureDebut"));
        LocalTime fin = parseHeure(body.get("heureFin"));
        if (debut == null || fin == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Heures de début et de fin requises."));
        }
        if (!fin.isAfter(debut)) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'heure de fin doit être après l'heure de début."));
        }

        FormateurAgendaEntry entry = FormateurAgendaEntry.builder()
                .formateur(formateur)
                .centre(centre)
                .jourSemaine(jour)
                .heureDebut(debut)
                .heureFin(fin)
                .notes(readText(body.get("notes")))
                .build();

        FormateurAgendaEntry saved = agendaRepository.save(entry);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('FORMATEUR')")
    @Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        Optional<FormateurAgendaEntry> entryOpt = agendaRepository.findById(id);
        if (entryOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FormateurAgendaEntry entry = entryOpt.get();
        if (entry.getFormateur() == null || !entry.getFormateur().getId().equals(formateur.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }

        if (body.containsKey("centreId")) {
            Optional<Centre> centreOpt = resolveCentre(body.get("centreId"));
            if (centreOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Centre introuvable."));
            }
            if (!appartientAuFormateur(centreOpt.get(), formateur)) {
                return ResponseEntity.status(403).body(Map.of("message", "Vous n'êtes pas rattaché à ce centre."));
            }
            entry.setCentre(centreOpt.get());
        }
        if (body.containsKey("jourSemaine")) {
            Short jour = parseJour(body.get("jourSemaine"));
            if (jour == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Jour de la semaine invalide (1 à 7)."));
            }
            entry.setJourSemaine(jour);
        }
        LocalTime debut = body.containsKey("heureDebut") ? parseHeure(body.get("heureDebut")) : entry.getHeureDebut();
        LocalTime fin = body.containsKey("heureFin") ? parseHeure(body.get("heureFin")) : entry.getHeureFin();
        if (debut == null || fin == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Heures de début et de fin requises."));
        }
        if (!fin.isAfter(debut)) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'heure de fin doit être après l'heure de début."));
        }
        entry.setHeureDebut(debut);
        entry.setHeureFin(fin);
        if (body.containsKey("notes")) {
            entry.setNotes(readText(body.get("notes")));
        }

        FormateurAgendaEntry saved = agendaRepository.save(entry);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FORMATEUR')")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        Optional<FormateurAgendaEntry> entryOpt = agendaRepository.findById(id);
        if (entryOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FormateurAgendaEntry entry = entryOpt.get();
        if (entry.getFormateur() == null || !entry.getFormateur().getId().equals(formateur.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        agendaRepository.delete(entry);
        return ResponseEntity.ok(Map.of("message", "Créneau supprimé."));
    }

    private boolean appartientAuFormateur(Centre centre, User formateur) {
        return centre.getFormateurs() != null
                && centre.getFormateurs().stream().anyMatch(f -> f.getId().equals(formateur.getId()));
    }

    private Optional<Centre> resolveCentre(Object rawId) {
        if (rawId == null) return Optional.empty();
        try {
            return centreRepository.findById(Long.valueOf(rawId.toString()));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private Short parseJour(Object raw) {
        if (raw == null) return null;
        try {
            short jour = Short.parseShort(raw.toString());
            return (jour >= 1 && jour <= 7) ? jour : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalTime parseHeure(Object raw) {
        if (raw == null) return null;
        String text = raw.toString().trim();
        if (text.isEmpty()) return null;
        try {
            return LocalTime.parse(text.length() > 5 ? text.substring(0, 5) : text, HHmm);
        } catch (Exception e) {
            return null;
        }
    }

    private String readText(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        return ("null".equalsIgnoreCase(text) || text.isEmpty()) ? null : text;
    }

    private Map<String, Object> toResponse(FormateurAgendaEntry entry) {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("id", entry.getId());
        if (entry.getCentre() != null) {
            out.put("centreId", entry.getCentre().getId());
            out.put("centreNom", entry.getCentre().getNom());
            out.put("centre", Map.of("id", entry.getCentre().getId(), "nom", entry.getCentre().getNom()));
        } else {
            out.put("centreNom", entry.getCentreNom());
        }
        out.put("jourSemaine", entry.getJourSemaine());
        out.put("heureDebut", entry.getHeureDebut() != null ? entry.getHeureDebut().format(HHmm) : null);
        out.put("heureFin", entry.getHeureFin() != null ? entry.getHeureFin().format(HHmm) : null);
        out.put("notes", entry.getNotes());
        return out;
    }
}
