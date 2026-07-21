package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.EnfantProfile;
import com.nehemiahlab.platform.model.EnfantProject;
import com.nehemiahlab.platform.model.FormateurDocument;
import com.nehemiahlab.platform.model.SessionCours;
import com.nehemiahlab.platform.model.Transaction;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.EnfantProfileRepository;
import com.nehemiahlab.platform.repository.EnfantProjectRepository;
import com.nehemiahlab.platform.repository.FormateurDocumentRepository;
import com.nehemiahlab.platform.repository.SessionCoursRepository;
import com.nehemiahlab.platform.repository.TransactionRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.security.SecureFileStorage;
import com.nehemiahlab.platform.service.CentreAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Accès contrôlé aux fichiers sensibles (CNI, justificatifs).
 */
@RestController
@RequestMapping("/secure-files")
public class SecureFileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private EnfantProfileRepository enfantProfileRepository;

    @Autowired
    private EnfantProjectRepository enfantProjectRepository;

    @Autowired
    private FormateurDocumentRepository formateurDocumentRepository;

    @Autowired
    private SessionCoursRepository sessionCoursRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @GetMapping("/avatars/**")
    public ResponseEntity<?> getAvatar(jakarta.servlet.http.HttpServletRequest request) {
        String relative = extractRelative(request.getRequestURI(), "/secure-files/avatars/", "/uploads/avatars/");
        if (relative == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));
        }
        return resolveAndServe(relative);
    }

    @GetMapping("/identite/**")
    public ResponseEntity<?> getIdentite(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null || !(auth.getPrincipal() instanceof User current)) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise."));
        }

        String relative = extractRelative(request.getRequestURI(), "/secure-files/identite/", "/uploads/identite/");
        if (relative == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));
        }

        try {
            if (current.getRole() != Role.DIRECTEUR) {
                User fresh = userRepository.findById(current.getId()).orElse(current);
                boolean owns = relative.equals(fresh.getCarteIdentiteRecto())
                        || relative.equals(fresh.getCarteIdentiteVerso());
                if (!owns) {
                    return ResponseEntity.status(403).body(Map.of("message", "Accès refusé."));
                }
            }

            return resolveAndServe(relative);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", "Fichier introuvable."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur de lecture."));
        }
    }

    @GetMapping("/transactions/**")
    public ResponseEntity<?> getJustificatif(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null || !(auth.getPrincipal() instanceof User current)) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise."));
        }

        String relative = extractRelative(request.getRequestURI(), "/secure-files/transactions/", "/uploads/transactions/");
        if (relative == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));
        }

        try {
            if (current.getRole() == Role.DIRECTEUR || current.getRole() == Role.COMPTABLE) {
                return resolveAndServe(relative);
            }

            if (current.getRole() == Role.FORMATEUR) {
                List<Transaction> mine = transactionRepository.findByFormateurIdOrderByCreatedAtDesc(current.getId());
                boolean owns = mine.stream().anyMatch(tx -> relative.equals(tx.getJustificatifUrl()));
                if (owns) {
                    return resolveAndServe(relative);
                }
            }

            return ResponseEntity.status(403).body(Map.of("message", "Accès refusé."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", "Fichier introuvable."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur de lecture."));
        }
    }

    @GetMapping("/enfants/**")
    public ResponseEntity<?> getEnfantPhoto(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null || !(auth.getPrincipal() instanceof User current)) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise."));
        }
        String relative = extractRelative(request.getRequestURI(), "/secure-files/enfants/", "/uploads/enfants/");
        if (relative == null) return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));

        EnfantProfile owner = enfantProfileRepository.findByPhotoUrl(relative).orElse(null);
        if (owner == null || !centreAccessService.canAccessEnfant(current, owner)) {
            return ResponseEntity.status(403).body(Map.of("message", "Accès refusé."));
        }
        return resolveAndServe(relative);
    }

    @GetMapping("/projets-enfants/**")
    public ResponseEntity<?> getProjetEnfant(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null || !(auth.getPrincipal() instanceof User current)) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise."));
        }
        String relative = extractRelative(
                request.getRequestURI(), "/secure-files/projets-enfants/", "/uploads/projets-enfants/");
        if (relative == null) return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));

        EnfantProject owner = enfantProjectRepository.findByMediaUrl(relative).orElse(null);
        if (owner == null || !centreAccessService.canAccessEnfant(current, owner.getEnfant())) {
            return ResponseEntity.status(403).body(Map.of("message", "Accès refusé."));
        }
        return resolveAndServe(relative);
    }

    @GetMapping("/formateur-documents/**")
    public ResponseEntity<?> getFormateurDocument(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null || !(auth.getPrincipal() instanceof User current)) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise."));
        }
        String relative = extractRelative(
                request.getRequestURI(), "/secure-files/formateur-documents/", "/uploads/formateur-documents/");
        if (relative == null) return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));

        FormateurDocument owner = formateurDocumentRepository.findByUrl(relative).orElse(null);
        boolean isOwner = owner != null && owner.getFormateur() != null
                && owner.getFormateur().getId().equals(current.getId());
        boolean isDirecteur = current.getRole() == Role.DIRECTEUR;
        if (owner == null || !(isOwner || isDirecteur)) {
            return ResponseEntity.status(403).body(Map.of("message", "Accès refusé."));
        }
        return resolveAndServe(relative);
    }

    @GetMapping("/rapports/**")
    public ResponseEntity<?> getRapport(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null || !(auth.getPrincipal() instanceof User current)) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise."));
        }
        String relative = extractRelative(request.getRequestURI(), "/secure-files/rapports/", "/uploads/rapports/");
        if (relative == null) return ResponseEntity.badRequest().body(Map.of("message", "Chemin invalide."));

        SessionCours owner = sessionCoursRepository.findByRapportUrl(relative).orElse(null);
        if (owner == null || owner.getCentre() == null
                || !centreAccessService.canAccessCentre(current, owner.getCentre().getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Accès refusé."));
        }
        return resolveAndServe(relative);
    }

    private ResponseEntity<?> resolveAndServe(String relative) {
        try {
            return serveFile(secureFileStorage.open(relative));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", "Fichier introuvable."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur de lecture."));
        }
    }

    private static String extractRelative(String fullPath, String marker, String prefix) {
        int idx = fullPath.indexOf(marker);
        if (idx < 0) return null;
        String rest = fullPath.substring(idx + marker.length());
        if (rest.isBlank() || rest.contains("..") || rest.contains("%")) return null;
        return prefix + rest;
    }

    private static ResponseEntity<Resource> serveFile(SecureFileStorage.StoredFile file) {
        String contentType = file.contentType();
        if (contentType == null || contentType.isBlank()) contentType = "application/octet-stream";
        boolean forceDownload = contentType.contains("html")
                || contentType.contains("svg")
                || contentType.contains("javascript");

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(forceDownload ? "application/octet-stream" : contentType));
        if (file.contentLength() >= 0) {
            builder.contentLength(file.contentLength());
        }
        if (forceDownload) {
            builder.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"");
        }
        return builder.body(file.resource());
    }
}
