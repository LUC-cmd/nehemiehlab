package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.EvaluationSession;
import com.nehemiahlab.platform.model.SessionCours;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.EvaluationSessionRepository;
import com.nehemiahlab.platform.repository.SessionCoursRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SeanceRepartitionService {

    private final CentreRepository centreRepository;
    private final SessionCoursRepository sessionCoursRepository;
    private final EvaluationSessionRepository evaluationSessionRepository;
    private final EleveRepository eleveRepository;
    private final UserRepository userRepository;

    public SeanceRepartitionService(
            CentreRepository centreRepository,
            SessionCoursRepository sessionCoursRepository,
            EvaluationSessionRepository evaluationSessionRepository,
            EleveRepository eleveRepository,
            UserRepository userRepository
    ) {
        this.centreRepository = centreRepository;
        this.sessionCoursRepository = sessionCoursRepository;
        this.evaluationSessionRepository = evaluationSessionRepository;
        this.eleveRepository = eleveRepository;
        this.userRepository = userRepository;
    }

    public record Result(
            SessionCours session,
            SessionCours seanceSoiree,
            List<EvaluationSession> evaluationsSoiree,
            int minutesReportees,
            boolean doubleCreneau
    ) {}

    public record HistoriqueResult(
            int seancesAvant,
            int seancesApres,
            int minutesReportees
    ) {}

    @Transactional
    public Result appliquer(SessionCours session, long minutesHorloge, List<EvaluationSession> evaluationsMatin) {
        Centre centre = session.getCentre();
        if (centre != null && centre.getId() != null) {
            centre = centreRepository.findById(centre.getId()).orElse(centre);
        }
        int report = centre != null && centre.getMinutesReportees() != null ? centre.getMinutesReportees() : 0;
        int disponibles = (int) Math.max(0, minutesHorloge) + report;
        SeanceDureeRepartition.Plan plan = SeanceDureeRepartition.planifier(disponibles);

        LocalDateTime debut = session.getHeureDebut() != null ? session.getHeureDebut() : LocalDateTime.now();
        LocalDateTime finMatin = debut.plusMinutes(Math.max(0, plan.minutesMatin()));
        session.setHeureDebut(debut);
        session.setHeureFin(finMatin);
        session.setStatut("CLOTUREE");
        session.setDureeReelleMinutes((long) plan.minutesMatin());
        if (plan.minutesMatin() == SeanceDureeRepartition.BLOC_MINUTES) {
            session.setTitre(SeanceDureeRepartition.titreMatin(session.getTitre()));
            session.setDureePrevueMinutes(SeanceDureeRepartition.BLOC_MINUTES);
        }
        sessionCoursRepository.save(session);

        if (centre != null) {
            centre.setMinutesReportees(plan.minutesReportees());
            centreRepository.save(centre);
            session.setCentre(centre);
        }

        if (!plan.doubleCreneau()) {
            return new Result(session, null, List.of(), plan.minutesReportees(), false);
        }

        LocalDateTime debutSoir = finMatin.plusMinutes(SeanceDureeRepartition.PAUSE_MINUTES);
        LocalDateTime finSoir = debutSoir.plusMinutes(SeanceDureeRepartition.BLOC_MINUTES);
        SessionCours soiree = copierSession(
                session,
                SeanceDureeRepartition.titreSoiree(session.getTitre()),
                debutSoir,
                finSoir);
        sessionCoursRepository.save(soiree);
        List<EvaluationSession> copies = copierEvaluations(evaluationsMatin, soiree, false);
        return new Result(session, soiree, copies, plan.minutesReportees(), true);
    }

    @Transactional
    public HistoriqueResult repartirSeancesExistantes(Centre centre) {
        if (centre == null || centre.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Centre obligatoire.");
        }
        Centre managed = centreRepository.findById(centre.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Centre introuvable."));

        List<SessionCours> toutes = sessionCoursRepository.findByCentreIdOrderByHeureDebutAsc(managed.getId());
        List<SessionCours> cloturees = toutes.stream()
                .filter(s -> "CLOTUREE".equals(s.getStatut()))
                .toList();
        if (cloturees.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucune séance clôturée à découper pour ce centre.");
        }
        boolean dejaFait = cloturees.stream().allMatch(s ->
                s.getDureeReelleMinutes() != null && s.getDureeReelleMinutes() <= SeanceDureeRepartition.BLOC_MINUTES);
        if (dejaFait) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ces séances sont déjà en blocs de 3 h. Aucune modification.");
        }

        List<SeanceDureeRepartition.SeanceSource> sources = new ArrayList<>();
        int totalMinutes = 0;
        for (int i = 0; i < cloturees.size(); i++) {
            SessionCours session = cloturees.get(i);
            int minutes = minutesSession(session);
            totalMinutes += minutes;
            LocalDateTime debut = session.getHeureDebut() != null ? session.getHeureDebut() : session.getCreatedAt();
            sources.add(new SeanceDureeRepartition.SeanceSource(debut, minutes, i));
        }

        List<SeanceDureeRepartition.CreneauPlan> creneaux = SeanceDureeRepartition.planifierHistorique(sources);
        if (creneaux.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Pas assez de minutes pour former une séance de 3 h.");
        }

        Set<Long> eleveIds = new HashSet<>();
        Set<Long> formateurIds = new HashSet<>();
        List<List<EvaluationSession>> evalsParSource = new ArrayList<>();
        for (SessionCours session : cloturees) {
            if (session.getFormateur() != null) {
                formateurIds.add(session.getFormateur().getId());
            }
            List<EvaluationSession> evals = evaluationSessionRepository.findBySessionCoursId(session.getId());
            evalsParSource.add(evals);
            for (EvaluationSession eval : evals) {
                if (eval.getEleve() != null) {
                    eleveIds.add(eval.getEleve().getId());
                }
            }
        }

        List<SessionCours> nouvelles = new ArrayList<>();
        boolean[] projetFinalDejaCopie = new boolean[cloturees.size()];
        for (SeanceDureeRepartition.CreneauPlan creneau : creneaux) {
            SessionCours origine = cloturees.get(creneau.sourceIndex());
            String titre = creneau.type() == SeanceDureeRepartition.TypeCreneau.MATIN
                    ? SeanceDureeRepartition.titreMatin(origine.getTitre())
                    : SeanceDureeRepartition.titreSoiree(origine.getTitre());
            SessionCours created = copierSession(origine, titre, creneau.heureDebut(), creneau.heureFin());
            created.setCreatedAt(creneau.heureDebut());
            sessionCoursRepository.save(created);
            boolean copierProjetFinal = !projetFinalDejaCopie[creneau.sourceIndex()];
            projetFinalDejaCopie[creneau.sourceIndex()] = true;
            copierEvaluations(evalsParSource.get(creneau.sourceIndex()), created, copierProjetFinal);
            nouvelles.add(created);
        }

        for (int i = 0; i < cloturees.size(); i++) {
            evaluationSessionRepository.deleteAll(evalsParSource.get(i));
        }
        evaluationSessionRepository.flush();
        sessionCoursRepository.deleteAll(cloturees);

        int reste = SeanceDureeRepartition.minutesRestantesHistorique(totalMinutes);
        managed.setMinutesReportees(reste);
        centreRepository.save(managed);

        recalculerHeuresEleves(eleveIds);
        recalculerHeuresFormateurs(formateurIds);

        return new HistoriqueResult(cloturees.size(), nouvelles.size(), reste);
    }

    private static int minutesSession(SessionCours session) {
        if (session.getDureeReelleMinutes() != null && session.getDureeReelleMinutes() > 0) {
            return session.getDureeReelleMinutes().intValue();
        }
        if (session.getHeureDebut() != null && session.getHeureFin() != null) {
            return (int) Math.max(0, Duration.between(session.getHeureDebut(), session.getHeureFin()).toMinutes());
        }
        return session.getDureePrevueMinutes() != null ? session.getDureePrevueMinutes() : 0;
    }

    private SessionCours copierSession(SessionCours origine, String titre, LocalDateTime debut, LocalDateTime fin) {
        return SessionCours.builder()
                .titre(titre)
                .centre(origine.getCentre())
                .formateur(origine.getFormateur())
                .heureDebut(debut)
                .heureFin(fin)
                .dureePrevueMinutes(SeanceDureeRepartition.BLOC_MINUTES)
                .statut("CLOTUREE")
                .moduleFait(origine.getModuleFait())
                .moduleCoursId(origine.getModuleCoursId())
                .etatEquipements(origine.getEtatEquipements())
                .defisSession(origine.getDefisSession())
                .latitudeDebut(origine.getLatitudeDebut())
                .longitudeDebut(origine.getLongitudeDebut())
                .precisionDebutMetres(origine.getPrecisionDebutMetres())
                .latitudeFin(origine.getLatitudeFin())
                .longitudeFin(origine.getLongitudeFin())
                .precisionFinMetres(origine.getPrecisionFinMetres())
                .dureeReelleMinutes((long) SeanceDureeRepartition.BLOC_MINUTES)
                .rapportUrl(origine.getRapportUrl())
                .manuelle(origine.isManuelle())
                .build();
    }

    private List<EvaluationSession> copierEvaluations(
            List<EvaluationSession> sources,
            SessionCours cible,
            boolean copierProjetFinal
    ) {
        List<EvaluationSession> copies = new ArrayList<>();
        LocalDateTime debut = cible.getHeureDebut();
        LocalDateTime fin = cible.getHeureFin();
        for (EvaluationSession source : sources) {
            boolean present = source.isPresent();
            EvaluationSession copie = EvaluationSession.builder()
                    .sessionCours(cible)
                    .eleve(source.getEleve())
                    .present(present)
                    .enRetard(source.isEnRetard())
                    .note(source.getNote())
                    .commentaire(source.getCommentaire())
                    .projetTravaille(source.getProjetTravaille())
                    .projetFinal(copierProjetFinal && source.isProjetFinal())
                    .projetProbleme(copierProjetFinal ? source.getProjetProbleme() : null)
                    .projetSolution(copierProjetFinal ? source.getProjetSolution() : null)
                    .projetFichierUrl(source.getProjetFichierUrl())
                    .projetFichierNom(source.getProjetFichierNom())
                    .heureArrivee(present ? debut : null)
                    .heureDepart(present ? fin : null)
                    .dureeMinutes(present ? (long) SeanceDureeRepartition.BLOC_MINUTES : 0L)
                    .dureeSecondes(present ? (long) SeanceDureeRepartition.BLOC_MINUTES * 60 : 0L)
                    .build();
            copies.add(evaluationSessionRepository.save(copie));
        }
        return copies;
    }

    private void recalculerHeuresEleves(Set<Long> eleveIds) {
        for (Long eleveId : eleveIds) {
            Eleve eleve = eleveRepository.findById(eleveId).orElse(null);
            if (eleve == null) continue;
            double total = 0;
            for (EvaluationSession eval : evaluationSessionRepository.findByEleveId(eleveId)) {
                if (eval.getDureeMinutes() != null) {
                    total += eval.getDureeMinutes() / 60.0;
                }
            }
            eleve.setTotalHeures(Math.round(total * 100.0) / 100.0);
            eleveRepository.save(eleve);
        }
    }

    private void recalculerHeuresFormateurs(Set<Long> formateurIds) {
        for (Long formateurId : formateurIds) {
            User formateur = userRepository.findById(formateurId).orElse(null);
            if (formateur == null) continue;
            double total = sessionCoursRepository.findByFormateurIdOrderByHeureDebutDesc(formateurId).stream()
                    .filter(s -> "CLOTUREE".equals(s.getStatut()) && s.getDureeReelleMinutes() != null)
                    .mapToDouble(s -> s.getDureeReelleMinutes() / 60.0)
                    .sum();
            formateur.setTotalHeuresSeances(Math.round(total * 100.0) / 100.0);
            userRepository.save(formateur);
        }
    }
}
