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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SeanceRepartitionService {

    private static final Logger log = LoggerFactory.getLogger(SeanceRepartitionService.class);

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

    public record HistoriqueResult(int seancesAvant, int seancesApres, int minutesReportees) {}

    @Transactional
    public int repartirTousLesCentresSiBesoin() {
        int centresTraites = 0;
        Set<Long> formateurIds = new HashSet<>();
        for (Centre centre : centreRepository.findAll()) {
            try {
                if (aDesSeancesLongues(centre.getId())) {
                    HistoriqueResult result = repartirSeancesExistantes(centre);
                    centresTraites++;
                    log.info("Centre {} : {} séance(s) redistribuée(s) en {} séance(s) de 3 h (reste {} min).",
                            centre.getNom(), result.seancesAvant(), result.seancesApres(), result.minutesReportees());
                } else if (recalerHorairesScolaires(centre) > 0) {
                    centresTraites++;
                    log.info("Centre {} : horaires recadrés entre 8 h et 17 h.", centre.getNom());
                }
            } catch (ResponseStatusException ex) {
                if (ex.getStatusCode() != HttpStatus.CONFLICT && ex.getStatusCode() != HttpStatus.BAD_REQUEST) {
                    throw ex;
                }
            }
        }
        for (SessionCours session : sessionCoursRepository.findAll()) {
            if (session.getFormateur() != null) {
                formateurIds.add(session.getFormateur().getId());
            }
        }
        for (Long formateurId : formateurIds) {
            resoudreConflitsFormateur(formateurId);
        }
        return centresTraites;
    }

    @Transactional
    public int repartirCentresDuFormateurSiBesoin(Long formateurId) {
        if (formateurId == null) {
            return 0;
        }
        int centresTraites = 0;
        for (Centre centre : centreRepository.findByFormateurId(formateurId)) {
            try {
                if (aDesSeancesLongues(centre.getId())) {
                    HistoriqueResult result = repartirSeancesExistantes(centre);
                    centresTraites++;
                    log.info("Centre {} : {} séance(s) redistribuée(s) en {} séance(s) de 3 h (reste {} min).",
                            centre.getNom(), result.seancesAvant(), result.seancesApres(), result.minutesReportees());
                } else if (recalerHorairesScolaires(centre) > 0) {
                    centresTraites++;
                }
            } catch (ResponseStatusException ex) {
                if (ex.getStatusCode() != HttpStatus.CONFLICT && ex.getStatusCode() != HttpStatus.BAD_REQUEST) {
                    throw ex;
                }
            }
        }
        if (centresTraites > 0) {
            resoudreConflitsFormateur(formateurId);
        }
        return centresTraites;
    }

    @Transactional
    public int recalerHorairesScolaires(Centre centre) {
        if (centre == null || centre.getId() == null) {
            return 0;
        }
        List<SessionCours> cloturees = sessionCoursRepository.findByCentreIdOrderByHeureDebutAsc(centre.getId()).stream()
                .filter(s -> "CLOTUREE".equals(s.getStatut()) && s.getHeureDebut() != null)
                .toList();
        int deplaces = 0;
        Map<LocalDate, List<SessionCours>> parJour = new LinkedHashMap<>();
        for (SessionCours session : cloturees) {
            parJour.computeIfAbsent(session.getHeureDebut().toLocalDate(), d -> new ArrayList<>()).add(session);
        }
        int i = 0;
        for (Map.Entry<LocalDate, List<SessionCours>> entree : parJour.entrySet()) {
            List<SessionCours> duJour = new ArrayList<>(entree.getValue());
            boolean jourARecaler = duJour.stream().anyMatch(s ->
                    SeanceDureeRepartition.horaireHorsJourneeScolaire(s.getHeureDebut(), s.getHeureFin()));
            if (!jourARecaler) {
                continue;
            }
            LocalDate jour = entree.getKey();
            LocalDateTime curseur = SeanceDureeRepartition.matinScolaire(jour, jour.getDayOfYear());
            int places = 0;
            Long dernierCentre = null;
            for (SessionCours session : duJour) {
                if (places >= SeanceDureeRepartition.MAX_BLOCS_PAR_JOUR) {
                    break;
                }
                if (dernierCentre != null && session.getCentre() != null) {
                    boolean memeCentre = session.getCentre().getId().equals(dernierCentre);
                    int pause = memeCentre
                            ? SeanceDureeRepartition.pauseMemeCentreMinutes(i)
                            : SeanceDureeRepartition.pauseEntreCentresMinutes(i);
                    curseur = curseur.plusMinutes(pause);
                }
                if (!SeanceDureeRepartition.tientDansJourneeScolaire(curseur)) {
                    curseur = SeanceDureeRepartition.matinScolaire(jour, jour.getDayOfYear() + places + 1);
                    if (places > 0) {
                        break;
                    }
                }
                LocalDateTime debut = curseur;
                LocalDateTime fin = debut.plusMinutes(SeanceDureeRepartition.BLOC_MINUTES);
                session.setHeureDebut(debut);
                session.setHeureFin(fin);
                session.setDureeReelleMinutes((long) SeanceDureeRepartition.BLOC_MINUTES);
                sessionCoursRepository.save(session);
                List<EvaluationSession> evals = evaluationSessionRepository
                        .findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(session.getId());
                for (EvaluationSession eval : evals) {
                    if (eval.isPresent()) {
                        eval.setHeureArrivee(debut);
                        eval.setHeureDepart(fin);
                        evaluationSessionRepository.save(eval);
                    }
                }
                deplaces++;
                curseur = fin;
                dernierCentre = session.getCentre() != null ? session.getCentre().getId() : null;
                places++;
                i++;
            }
        }
        return deplaces;
    }

    public boolean aDesHorairesHorsJourneeScolaire(Long centreId) {
        if (centreId == null) {
            return false;
        }
        return sessionCoursRepository.findByCentreIdOrderByHeureDebutAsc(centreId).stream()
                .anyMatch(s -> "CLOTUREE".equals(s.getStatut())
                        && SeanceDureeRepartition.horaireHorsJourneeScolaire(s.getHeureDebut(), s.getHeureFin()));
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
        boolean dejaFait = cloturees.stream().allMatch(s -> minutesSession(s) <= SeanceDureeRepartition.BLOC_MINUTES);
        if (dejaFait) {
            int recales = recalerHorairesScolaires(managed);
            if (recales == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Ces séances sont déjà en blocs de 3 h entre 8 h et 17 h. Aucune modification.");
            }
            return new HistoriqueResult(cloturees.size(), cloturees.size(), 0);
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
            List<EvaluationSession> evals = evaluationSessionRepository
                    .findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(session.getId());
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
            SessionCours created = copierSession(
                    origine,
                    titre,
                    creneau.heureDebut(),
                    creneau.heureFin(),
                    !projetFinalDejaCopie[creneau.sourceIndex()]);
            created.setCreatedAt(creneau.heureDebut());
            sessionCoursRepository.save(created);
            boolean copierProjetFinal = !projetFinalDejaCopie[creneau.sourceIndex()];
            projetFinalDejaCopie[creneau.sourceIndex()] = true;
            copierEvaluations(evalsParSource.get(creneau.sourceIndex()), created, copierProjetFinal);
            nouvelles.add(created);
        }

        for (List<EvaluationSession> evals : evalsParSource) {
            evaluationSessionRepository.deleteAll(evals);
        }
        evaluationSessionRepository.flush();
        sessionCoursRepository.deleteAll(cloturees);
        sessionCoursRepository.flush();

        recalculerHeuresEleves(eleveIds);
        recalculerHeuresFormateurs(formateurIds);

        int reste = SeanceDureeRepartition.minutesNonPlacees(totalMinutes, creneaux.size());
        return new HistoriqueResult(cloturees.size(), nouvelles.size(), reste);
    }

    @Transactional
    public void resoudreConflitsFormateur(Long formateurId) {
        if (formateurId == null) {
            return;
        }
        List<SessionCours> sessions = sessionCoursRepository.findByFormateurIdOrderByHeureDebutDesc(formateurId).stream()
                .filter(s -> "CLOTUREE".equals(s.getStatut()) && s.getHeureDebut() != null)
                .sorted(Comparator.comparing(SessionCours::getHeureDebut))
                .toList();
        for (int i = 1; i < sessions.size(); i++) {
            SessionCours precedente = sessions.get(i - 1);
            SessionCours actuelle = sessions.get(i);
            if (actuelle.getCentre() == null || precedente.getCentre() == null) {
                continue;
            }
            LocalDateTime debut = actuelle.getHeureDebut();
            LocalDateTime fin = finEffective(actuelle);
            LocalDateTime autreDebut = precedente.getHeureDebut();
            LocalDateTime autreFin = finEffective(precedente);
            boolean memeCentre = actuelle.getCentre().getId().equals(precedente.getCentre().getId());
            if (FormateurTrajetSeanceService.messageConflit(
                    debut, fin, autreDebut, autreFin, memeCentre, nomCentre(precedente)) == null) {
                continue;
            }
            int pause = memeCentre
                    ? SeanceDureeRepartition.pauseMemeCentreMinutes(i)
                    : SeanceDureeRepartition.pauseEntreCentresMinutes(i);
            LocalDateTime nouveauDebut = autreFin.plusMinutes(pause);
            LocalDate jourEnregistre = actuelle.getHeureDebut().toLocalDate();
            if (!nouveauDebut.toLocalDate().equals(jourEnregistre)
                    || !SeanceDureeRepartition.tientDansJourneeScolaire(nouveauDebut)) {
                nouveauDebut = SeanceDureeRepartition.matinScolaire(jourEnregistre, i);
                if (autreFin.toLocalDate().equals(jourEnregistre)
                        && !nouveauDebut.isAfter(autreFin)) {
                    nouveauDebut = autreFin.plusMinutes(pause);
                }
                if (!SeanceDureeRepartition.tientDansJourneeScolaire(nouveauDebut)
                        || !nouveauDebut.toLocalDate().equals(jourEnregistre)) {
                    continue;
                }
            }
            actuelle.setHeureDebut(nouveauDebut);
            actuelle.setHeureFin(nouveauDebut.plusMinutes(SeanceDureeRepartition.BLOC_MINUTES));
            actuelle.setDureeReelleMinutes((long) SeanceDureeRepartition.BLOC_MINUTES);
            sessionCoursRepository.save(actuelle);
            List<EvaluationSession> evals = evaluationSessionRepository
                    .findBySessionCoursIdOrderByEleve_NomAscEleve_PrenomAsc(actuelle.getId());
            for (EvaluationSession eval : evals) {
                if (eval.isPresent()) {
                    eval.setHeureArrivee(actuelle.getHeureDebut());
                    eval.setHeureDepart(actuelle.getHeureFin());
                    evaluationSessionRepository.save(eval);
                }
            }
        }
    }

    private boolean aDesSeancesLongues(Long centreId) {
        return sessionCoursRepository.findByCentreIdOrderByHeureDebutAsc(centreId).stream()
                .anyMatch(s -> "CLOTUREE".equals(s.getStatut()) && minutesSession(s) > SeanceDureeRepartition.BLOC_MINUTES);
    }

    private static String nomCentre(SessionCours session) {
        if (session.getCentre() != null && session.getCentre().getNom() != null) {
            return session.getCentre().getNom();
        }
        return "un autre centre";
    }

    private static LocalDateTime finEffective(SessionCours session) {
        if (session.getHeureFin() != null) {
            return session.getHeureFin();
        }
        return session.getHeureDebut().plusMinutes(SeanceDureeRepartition.BLOC_MINUTES);
    }

    private static int minutesSession(SessionCours session) {
        if (session.getHeureDebut() != null && session.getHeureFin() != null) {
            return (int) Math.max(0, Duration.between(session.getHeureDebut(), session.getHeureFin()).toMinutes());
        }
        if (session.getDureeReelleMinutes() != null && session.getDureeReelleMinutes() > 0) {
            return session.getDureeReelleMinutes().intValue();
        }
        return session.getDureePrevueMinutes() != null ? session.getDureePrevueMinutes() : 0;
    }

    private SessionCours copierSession(
            SessionCours origine,
            String titre,
            LocalDateTime debut,
            LocalDateTime fin,
            boolean copierRapport
    ) {
        String titreOk = titre == null ? "Séance" : titre.trim();
        if (titreOk.length() > 240) {
            titreOk = titreOk.substring(0, 237) + "...";
        }
        return SessionCours.builder()
                .titre(titreOk)
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
                .rapportUrl(copierRapport ? origine.getRapportUrl() : null)
                .manuelle(origine.isManuelle())
                .build();
    }

    private void copierEvaluations(
            List<EvaluationSession> sources,
            SessionCours cible,
            boolean copierProjetFinal
    ) {
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
                    .projetFichierUrl(copierProjetFinal ? source.getProjetFichierUrl() : null)
                    .projetFichierNom(copierProjetFinal ? source.getProjetFichierNom() : null)
                    .heureArrivee(present ? debut : null)
                    .heureDepart(present ? fin : null)
                    .dureeMinutes(present ? (long) SeanceDureeRepartition.BLOC_MINUTES : 0L)
                    .dureeSecondes(present ? (long) SeanceDureeRepartition.BLOC_MINUTES * 60 : 0L)
                    .build();
            evaluationSessionRepository.save(copie);
        }
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
