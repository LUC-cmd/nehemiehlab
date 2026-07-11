package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Notification;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.Transaction;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.NotificationRepository;
import com.nehemiahlab.platform.repository.TransactionRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import com.nehemiahlab.platform.service.EmailNotificationService;
import com.nehemiahlab.platform.security.InputSanitizer;
import com.nehemiahlab.platform.security.SecureFileStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private static final long MAX_JUSTIFICATIF_BYTES = 10L * 1024 * 1024; // 10 Mo

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @Autowired
    private SecureFileStorage secureFileStorage;

    @GetMapping
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR')")
    public ResponseEntity<?> getAll(
            Authentication auth,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long formateurId) {

        User user = (User) auth.getPrincipal();
        if (user.getRole() == Role.FORMATEUR) {
            // Un formateur ne voit que ses transactions
            if (statut != null) {
                return ResponseEntity.ok(transactionRepository.findByFormateurIdAndStatutOrderByCreatedAtDesc(user.getId(), statut));
            }
            return ResponseEntity.ok(transactionRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId()));
        }

        if (statut != null && formateurId != null) {
            return ResponseEntity.ok(transactionRepository.findByFormateurIdAndStatutOrderByCreatedAtDesc(formateurId, statut));
        } else if (statut != null) {
            return ResponseEntity.ok(transactionRepository.findByStatutOrderByCreatedAtDesc(statut));
        } else if (formateurId != null) {
            return ResponseEntity.ok(transactionRepository.findByFormateurIdOrderByCreatedAtDesc(formateurId));
        }
        return ResponseEntity.ok(transactionRepository.findAll());
    }

    @GetMapping("/mes-transactions")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<List<Transaction>> getMesTransactions(Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        return ResponseEntity.ok(transactionRepository.findByFormateurIdOrderByCreatedAtDesc(formateur.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR')")
    public ResponseEntity<?> getById(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        Optional<Transaction> txOpt = transactionRepository.findById(id);
        if (txOpt.isEmpty()) return ResponseEntity.notFound().build();
        Transaction tx = txOpt.get();
        if (user.getRole() == Role.FORMATEUR && !tx.getFormateur().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }
        if (user.getRole() == Role.COMPTABLE || user.getRole() == Role.DIRECTEUR) {
            return ResponseEntity.ok(tx);
        }
        return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
    }

    /**
     * Saisie d'une transaction (paiement hors app).
     * Le justificatif (photo/PDF/doc) est optionnel : s'il manque, tout le monde
     * voit l'alerte, mais le formateur peut quand même valider.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('COMPTABLE')")
    public ResponseEntity<?> create(
            @RequestParam("formateurId") Long formateurId,
            @RequestParam("montant") Double montant,
            @RequestParam("type") String type,
            @RequestParam("description") String description,
            @RequestParam(value = "justificatif", required = false) MultipartFile justificatif
    ) {
        Optional<User> formateurOpt = userRepository.findById(formateurId);
        if (formateurOpt.isEmpty() || formateurOpt.get().getRole() != Role.FORMATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Formateur bénéficiaire invalide."));
        }
        if (montant == null || montant <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le montant doit être positif."));
        }
        if (description == null || description.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "La description est obligatoire."));
        }

        try {
            Transaction.TransactionBuilder builder = Transaction.builder()
                    .formateur(formateurOpt.get())
                    .montant(montant)
                    .type(InputSanitizer.clean(type))
                    .description(InputSanitizer.clean(description))
                    .statut("EN_ATTENTE");

            boolean hasProof = justificatif != null && !justificatif.isEmpty();
            if (hasProof) {
                SavedProof proof = saveJustificatif(justificatif);
                builder.justificatifUrl(proof.url())
                        .justificatifNom(proof.originalName())
                        .justificatifType(proof.contentType());
            }

            Transaction tx = builder.build();
            transactionRepository.save(tx);

            String notifMsg = hasProof
                    ? "Un paiement de " + tx.getMontant() + " FCFA a été saisi pour vous (justificatif joint). Vous pouvez le valider."
                    : "Un paiement de " + tx.getMontant() + " FCFA a été saisi pour vous. Une information manque (justificatif) — vous pouvez quand même valider.";

            String notifTitre = hasProof ? "Nouveau paiement en attente" : "Paiement saisi — information manquante";
            notificationRepository.save(Notification.builder()
                    .userId(formateurId)
                    .titre(notifTitre)
                    .message(notifMsg)
                    .type("TRANSACTION")
                    .lienId(tx.getId())
                    .build());

            User formateur = formateurOpt.get();
            emailNotificationService.sendSafe(
                    formateur.getEmail(),
                    "[SKA] " + notifTitre,
                    "Bonjour " + formateur.getPrenom() + " " + formateur.getNom() + ",\n\n"
                            + notifMsg + "\n\n"
                            + "Connectez-vous à la plateforme pour consulter et valider ce paiement.\n\n"
                            + "Smart Kids Academy"
            );

            return ResponseEntity.ok(tx);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'enregistrement de la transaction."));
        }
    }

    /**
     * Ajouter / remplacer le justificatif (comptable uniquement).
     * Le Directeur consulte et imprime, sans modifier.
     */
    @PostMapping(value = "/{id}/justificatif", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('COMPTABLE')")
    public ResponseEntity<?> uploadJustificatif(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        Optional<Transaction> txOpt = transactionRepository.findById(id);
        if (txOpt.isEmpty()) return ResponseEntity.notFound().build();
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fichier justificatif manquant."));
        }
        try {
            SavedProof proof = saveJustificatif(file);
            Transaction tx = txOpt.get();
            boolean wasMissing = tx.getJustificatifUrl() == null || tx.getJustificatifUrl().isBlank();
            tx.setJustificatifUrl(proof.url());
            tx.setJustificatifNom(proof.originalName());
            tx.setJustificatifType(proof.contentType());
            transactionRepository.save(tx);

            if (wasMissing && tx.getFormateur() != null) {
                String msg = "Le justificatif du paiement de " + tx.getMontant() + " FCFA a été joint. Vous pouvez le consulter.";
                notificationRepository.save(Notification.builder()
                        .userId(tx.getFormateur().getId())
                        .titre("Justificatif ajouté")
                        .message(msg)
                        .type("TRANSACTION")
                        .lienId(tx.getId())
                        .build());
                emailNotificationService.sendSafe(
                        tx.getFormateur().getEmail(),
                        "[SKA] Justificatif ajouté",
                        "Bonjour " + tx.getFormateur().getPrenom() + " " + tx.getFormateur().getNom() + ",\n\n"
                                + msg + "\n\nSmart Kids Academy"
                );
            }
            return ResponseEntity.ok(tx);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de l'upload du justificatif."));
        }
    }

    @PutMapping("/{id}/valider")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> valider(@PathVariable Long id, Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        Optional<Transaction> txOpt = transactionRepository.findById(id);

        if (txOpt.isEmpty()) return ResponseEntity.notFound().build();

        Transaction tx = txOpt.get();
        if (!tx.getFormateur().getId().equals(formateur.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }

        tx.setStatut("VALIDEE");
        tx.setValidatedAt(LocalDateTime.now());
        transactionRepository.save(tx);

        List<User> comptables = userRepository.findByRole(Role.COMPTABLE);
        String msg = "Le formateur " + formateur.getPrenom() + " " + formateur.getNom() + " a validé le paiement de " + tx.getMontant() + " FCFA.";
        for (User comptable : comptables) {
            notificationRepository.save(Notification.builder()
                    .userId(comptable.getId())
                    .titre("Paiement validé")
                    .message(msg)
                    .type("TRANSACTION")
                    .lienId(tx.getId())
                    .build());
            emailNotificationService.sendSafe(
                    comptable.getEmail(),
                    "[SKA] Paiement validé",
                    "Bonjour " + comptable.getPrenom() + " " + comptable.getNom() + ",\n\n"
                            + msg + "\n\nSmart Kids Academy"
            );
        }

        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/{id}/refuser")
    @PreAuthorize("hasRole('FORMATEUR')")
    public ResponseEntity<?> refuser(@PathVariable Long id, Authentication auth) {
        User formateur = (User) auth.getPrincipal();
        Optional<Transaction> txOpt = transactionRepository.findById(id);

        if (txOpt.isEmpty()) return ResponseEntity.notFound().build();

        Transaction tx = txOpt.get();
        if (!tx.getFormateur().getId().equals(formateur.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Action non autorisée."));
        }

        tx.setStatut("REFUSEE");
        tx.setValidatedAt(LocalDateTime.now());
        transactionRepository.save(tx);

        List<User> comptables = userRepository.findByRole(Role.COMPTABLE);
        String msg = "Le formateur " + formateur.getPrenom() + " " + formateur.getNom() + " a refusé le paiement de " + tx.getMontant() + " FCFA.";
        for (User comptable : comptables) {
            notificationRepository.save(Notification.builder()
                    .userId(comptable.getId())
                    .titre("Paiement refusé")
                    .message(msg)
                    .type("TRANSACTION")
                    .lienId(tx.getId())
                    .build());
            emailNotificationService.sendSafe(
                    comptable.getEmail(),
                    "[SKA] Paiement refusé",
                    "Bonjour " + comptable.getPrenom() + " " + comptable.getNom() + ",\n\n"
                            + msg + "\n\nSmart Kids Academy"
            );
        }

        return ResponseEntity.ok(Map.of("success", true));
    }

    private SavedProof saveJustificatif(MultipartFile file) throws Exception {
        String url = secureFileStorage.store(file, "transactions", "document", MAX_JUSTIFICATIF_BYTES, "justificatif");
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "justificatif";
        // Ne garder que le nom de fichier (anti path traversal dans l'affichage)
        originalFilename = java.nio.file.Paths.get(originalFilename).getFileName().toString();
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "application/octet-stream";
        return new SavedProof(url, originalFilename, contentType);
    }

    private record SavedProof(String url, String originalName, String contentType) {}
}
