package com.nehemiahlab.platform.controller;

import com.nehemiahlab.platform.model.*;
import com.nehemiahlab.platform.repository.*;
import com.nehemiahlab.platform.service.CentreAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

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

    @Autowired
    private SessionCoursRepository sessionCoursRepository;

    @Autowired
    private CentreAccessService centreAccessService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('DIRECTEUR', 'COMPTABLE', 'FORMATEUR', 'COORDINATEUR', 'RESPONSABLE_CLUSTER')")
    public ResponseEntity<?> getStats(Authentication auth) {
        User user = (User) auth.getPrincipal();
        Map<String, Object> stats = new HashMap<>();

        if (user.getRole() == Role.FORMATEUR) {
            List<Centre> mesCentres = centreRepository.findByFormateurId(user.getId());
            long totalCentres = mesCentres.size();

            long totalEleves = mesCentres.stream()
                    .mapToLong(c -> eleveRepository.countByCentreId(c.getId()))
                    .sum();

            // Heures réelles des séances clôturées (début → fin)
            double totalHeures = sessionCoursRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId()).stream()
                    .filter(s -> "CLOTUREE".equals(s.getStatut()) && s.getDureeReelleMinutes() != null)
                    .mapToDouble(s -> s.getDureeReelleMinutes() / 60.0)
                    .sum();

            long totalFormations = moduleFormationRepository.countByFormateurId(user.getId());
            long totalSeances = sessionCoursRepository.findByFormateurIdOrderByCreatedAtDesc(user.getId()).stream()
                    .filter(s -> "CLOTUREE".equals(s.getStatut()))
                    .count();

            long txEnAttente = transactionRepository.countByFormateurIdAndStatut(user.getId(), "EN_ATTENTE");

            stats.put("totalCentres", totalCentres);
            stats.put("totalEleves", totalEleves);
            stats.put("totalHeuresFormation", Math.round(totalHeures * 10.0) / 10.0);
            stats.put("totalFormations", totalFormations);
            stats.put("totalSeances", totalSeances);
            stats.put("transactionsEnAttente", txEnAttente);

        } else if (user.getRole() == Role.COORDINATEUR || user.getRole() == Role.RESPONSABLE_CLUSTER) {
            List<Centre> centres = centreAccessService.accessibleCentres(user);
            List<Long> centreIds = centres.stream().map(Centre::getId).toList();
            List<Eleve> eleves = centreIds.stream()
                    .flatMap(id -> eleveRepository.findByCentreIdOrderByNomAscPrenomAsc(id).stream())
                    .toList();
            List<SessionCours> sessions = centreIds.stream()
                    .flatMap(id -> sessionCoursRepository.findByCentreIdOrderByCreatedAtDesc(id).stream())
                    .toList();

            double totalHeures = sessions.stream()
                    .filter(session -> "CLOTUREE".equals(session.getStatut())
                            && session.getDureeReelleMinutes() != null)
                    .mapToDouble(session -> session.getDureeReelleMinutes() / 60.0)
                    .sum();
            long totalFormations = centreIds.stream()
                    .mapToLong(id -> moduleFormationRepository.findByCentreIdOrderByDateDesc(id).size())
                    .sum();
            long signalementsActifs = signalementRepository.findByCentreIdInOrderByCreatedAtDesc(centreIds).stream()
                    .filter(signalement -> "EN_ATTENTE".equals(signalement.getStatut()))
                    .count();

            stats.put("totalCentres", centres.size());
            stats.put("totalEleves", eleves.size());
            stats.put("totalHeuresFormation", Math.round(totalHeures * 10.0) / 10.0);
            stats.put("totalFormations", totalFormations);
            stats.put("totalSeances", sessions.stream()
                    .filter(session -> "CLOTUREE".equals(session.getStatut())).count());
            stats.put("signalementsNonTraites", signalementsActifs);
        } else {
            // Stats globales réservées au Directeur et au Comptable.
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
            stats.put("heuresParMois", heuresReellesParMois());
        }

        return ResponseEntity.ok(stats);
    }

    /**
     * Heures réelles de formation groupées par mois calendaire, à partir des
     * séances effectivement clôturées (heureDebut + dureeReelleMinutes) — au
     * lieu de l'ancien graphique qui répartissait le total sur des pourcentages
     * fixes de Janvier à Août, peu importe la date réelle de démarrage du
     * programme (ce qui affichait des heures dès janvier même quand la
     * formation n'avait commencé que plus tard dans l'année).
     */
    private List<Map<String, Object>> heuresReellesParMois() {
        Map<YearMonth, Double> parMois = new TreeMap<>();
        for (SessionCours session : sessionCoursRepository.findByStatut("CLOTUREE")) {
            if (session.getHeureDebut() == null || session.getDureeReelleMinutes() == null) continue;
            YearMonth mois = YearMonth.from(session.getHeureDebut());
            parMois.merge(mois, session.getDureeReelleMinutes() / 60.0, Double::sum);
        }
        DateTimeFormatter moisFmt = DateTimeFormatter.ofPattern("MMM yyyy", Locale.FRENCH);
        List<Map<String, Object>> resultat = new ArrayList<>();
        for (Map.Entry<YearMonth, Double> entry : parMois.entrySet()) {
            String label = entry.getKey().atDay(1).format(moisFmt);
            label = label.substring(0, 1).toUpperCase(Locale.FRENCH) + label.substring(1);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("mois", label);
            point.put("heures", Math.round(entry.getValue() * 10.0) / 10.0);
            resultat.add(point);
        }
        return resultat;
    }
}
