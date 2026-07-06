package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private EleveRepository eleveRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private SignalementRepository signalementRepository;

    @Autowired
    private ModuleFormationRepository moduleFormationRepository;

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Authentication auth) {
        User user = (User) auth.getPrincipal();
        Map<String, Object> stats = new HashMap<>();

        long totalCentres = centreRepository.count();
        long totalFormateurs = userRepository.findByRole(Role.FORMATEUR).size();
        long totalEleves = eleveRepository.count();
        
        double totalHeures = eleveRepository.findAll().stream()
                .mapToDouble(e -> e.getTotalHeures() != null ? e.getTotalHeures() : 0.0)
                .sum();

        long txEnAttente = transactionRepository.countByStatut("EN_ATTENTE");
        long txValidees = transactionRepository.countByStatut("VALIDEE");
        long txRefusees = transactionRepository.countByStatut("REFUSEE");

        double montantTotal = transactionRepository.findAll().stream()
                .filter(t -> "VALIDEE".equals(t.getStatut()))
                .mapToDouble(Transaction::getMontant)
                .sum();

        long signalementsActifs = signalementRepository.countByStatut("EN_ATTENTE");
        long totalFormations = moduleFormationRepository.count();

        stats.put("totalCentres", totalCentres);
        stats.put("totalFormateurs", totalFormateurs);
        stats.put("totalEleves", totalEleves);
        stats.put("totalHeuresFormation", Math.round(totalHeures * 10.0) / 10.0);
        stats.put("transactionsEnAttente", txEnAttente);
        stats.put("transactionsValidees", txValidees);
        stats.put("transactionsRefusees", txRefusees);
        stats.put("montantTotalTransactions", montantTotal);
        stats.put("signalementsNonTraites", signalementsActifs);
        stats.put("totalFormations", totalFormations);

        return ResponseEntity.ok(stats);
    }
}
