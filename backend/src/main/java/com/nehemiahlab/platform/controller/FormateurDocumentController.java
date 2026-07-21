package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.FormateurDocument;
import com.nehemiahlab.platform.model.FormateurDocumentType;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.FormateurDocumentRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.SecureFileStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Espace documents du formateur : contrat, projets realises (.sb3) et
 * presentations (PPTX/PDF) demandees par le Directeur. Le formateur gere ses
 * propres documents ; le Directeur peut consulter ceux de n'importe quel
 * formateur depuis son profil.
 */
@RestController
@RequestMapping("/formateur-documents")
public class FormateurDocumentController {

    private static final Logger log = LoggerFactory.getLogger(FormateurDocumentController.class);
    private static final long MAX_DOCUMENT_BYTES = 20L * 1024 * 1024;
    private static final long MAX_PROJET_BYTES = 25L * 1024 * 1024;

    @Autowired
    private FormateurDocumentRepository formateurDocumentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @PostMapping("/me")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> uploadMine(
            Authentication auth,
            @RequestParam("type") String typeRaw,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "titre", required = false) String titre
    ) {
        User current = (User) auth.getPrincipal();
        FormateurDocumentType type = parseType(typeRaw);
        if (type == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Type de document invalide."));
        }

        try {
            String category = type == FormateurDocumentType.PROJET ? "media" : "document";
            long maxBytes = type == FormateurDocumentType.PROJET ? MAX_PROJET_BYTES : MAX_DOCUMENT_BYTES;
            String prefix = "formateur-doc-" + current.getId();
            String url = secureFileStorage.store(file, "formateur-documents", category, maxBytes, prefix);

            FormateurDocument doc = FormateurDocument.builder()
                    .formateur(userRepository.findById(current.getId()).orElse(current))
                    .type(type)
                    .titre(titre == null || titre.isBlank() ? null : titre.trim())
                    .url(url)
                    .nomFichierOriginal(file.getOriginalFilename())
                    .build();
            formateurDocumentRepository.save(doc);
            return ResponseEntity.ok(toDto(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Echec upload document formateur (type={}) pour utilisateur {}", typeRaw, current.getId(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du fichier."));
        }
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> listMine(Authentication auth, @RequestParam(required = false) String type) {
        User current = (User) auth.getPrincipal();
        return ResponseEntity.ok(list(current.getId(), type));
    }

    @DeleteMapping("/me/{id}")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> deleteMine(Authentication auth, @PathVariable Long id) {
        User current = (User) auth.getPrincipal();
        Optional<FormateurDocument> opt = formateurDocumentRepository.findById(id);
        if (opt.isEmpty() || opt.get().getFormateur() == null
                || !opt.get().getFormateur().getId().equals(current.getId())) {
            return ResponseEntity.status(404).body(Map.of("message", "Document introuvable."));
        }
        formateurDocumentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/formateur/{formateurId}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> listForFormateur(
            @PathVariable Long formateurId, @RequestParam(required = false) String type) {
        return ResponseEntity.ok(list(formateurId, type));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DIRECTEUR')")
    public ResponseEntity<?> deleteAsDirecteur(@PathVariable Long id) {
        if (formateurDocumentRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        formateurDocumentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private List<Map<String, Object>> list(Long formateurId, String typeRaw) {
        FormateurDocumentType type = typeRaw == null || typeRaw.isBlank() ? null : parseType(typeRaw);
        List<FormateurDocument> docs = type != null
                ? formateurDocumentRepository.findByFormateurIdAndTypeOrderByCreatedAtDesc(formateurId, type)
                : formateurDocumentRepository.findByFormateurIdOrderByCreatedAtDesc(formateurId);
        return docs.stream().map(this::toDto).toList();
    }

    private Map<String, Object> toDto(FormateurDocument d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("type", d.getType());
        m.put("titre", d.getTitre());
        m.put("url", d.getUrl());
        m.put("nomFichierOriginal", d.getNomFichierOriginal());
        m.put("createdAt", d.getCreatedAt());
        if (d.getFormateur() != null) {
            m.put("formateurId", d.getFormateur().getId());
            m.put("formateurNom", d.getFormateur().getNom());
            m.put("formateurPrenom", d.getFormateur().getPrenom());
        }
        return m;
    }

    private static FormateurDocumentType parseType(String raw) {
        if (raw == null) return null;
        try {
            return FormateurDocumentType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
