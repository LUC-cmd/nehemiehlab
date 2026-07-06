package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.Notification;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.Transaction;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.NotificationRepository;
import com.nehemiahlab.platform.repository.TransactionRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<List<Transaction>> getAll(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long formateurId) {

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

    @PostMapping
    @PreAuthorize("hasRole('COMPTABLE')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long formateurId = Long.valueOf(body.get("formateurId").toString());
        Optional<User> formateurOpt = userRepository.findById(formateurId);

        if (formateurOpt.isEmpty() || formateurOpt.get().getRole() != Role.FORMATEUR) {
            return ResponseEntity.badRequest().body(Map.of("message", "Formateur bénéficiaire invalide."));
        }

        Transaction tx = Transaction.builder()
                .formateur(formateurOpt.get())
                .montant(Double.valueOf(body.get("montant").toString()))
                .type(body.get("type").toString())
                .description(body.get("description").toString())
                .statut("EN_ATTENTE")
                .build();

        transactionRepository.save(tx);

        // Envoyer une notification au Formateur
        notificationRepository.save(Notification.builder()
                .userId(formateurId)
                .titre("Nouveau paiement en attente")
                .message("Un paiement de " + tx.getMontant() + " FCFA a été émis pour vous. Veuillez le valider.")
                .type("TRANSACTION")
                .lienId(tx.getId())
                .build());

        return ResponseEntity.ok(tx);
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

        // Notifier tous les comptables
        List<User> comptables = userRepository.findByRole(Role.COMPTABLE);
        for (User comptable : comptables) {
            notificationRepository.save(Notification.builder()
                    .userId(comptable.getId())
                    .titre("Paiement validé")
                    .message("Le formateur " + formateur.getPrenom() + " " + formateur.getNom() + " a validé le paiement de " + tx.getMontant() + " FCFA.")
                    .type("TRANSACTION")
                    .lienId(tx.getId())
                    .build());
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

        // Notifier tous les comptables
        List<User> comptables = userRepository.findByRole(Role.COMPTABLE);
        for (User comptable : comptables) {
            notificationRepository.save(Notification.builder()
                    .userId(comptable.getId())
                    .titre("Paiement refusé")
                    .message("Le formateur " + formateur.getPrenom() + " " + formateur.getNom() + " a refusé le paiement de " + tx.getMontant() + " FCFA.")
                    .type("TRANSACTION")
                    .lienId(tx.getId())
                    .build());
        }

        return ResponseEntity.ok(Map.of("success", true));
    }
}
