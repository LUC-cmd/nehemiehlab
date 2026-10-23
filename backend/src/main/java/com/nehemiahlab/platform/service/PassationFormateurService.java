package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.FormateurAgendaEntry;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.SessionCours;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.FormateurAgendaEntryRepository;
import com.nehemiahlab.platform.repository.SessionCoursRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Remplacement du formateur d'un centre par le Directeur.
 * Le nouveau formateur reprend la séance restée ouverte et les créneaux d'agenda du centre ;
 * les séances déjà clôturées restent au nom (et dans les heures) de l'ancien formateur,
 * mais le nouveau les voit en lecture seule pour continuer le suivi des enfants.
 */
@Service
public class PassationFormateurService {

    public record Resultat(String ancienNom, String nouveauNom, int seancesReprises, int creneauxRepris) {}

    private final CentreRepository centreRepository;
    private final UserRepository userRepository;
    private final SessionCoursRepository sessionCoursRepository;
    private final FormateurAgendaEntryRepository agendaRepository;

    public PassationFormateurService(
            CentreRepository centreRepository,
            UserRepository userRepository,
            SessionCoursRepository sessionCoursRepository,
            FormateurAgendaEntryRepository agendaRepository
    ) {
        this.centreRepository = centreRepository;
        this.userRepository = userRepository;
        this.sessionCoursRepository = sessionCoursRepository;
        this.agendaRepository = agendaRepository;
    }

    @Transactional
    public Resultat remplacer(Long centreId, Long nouveauId) {
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Centre introuvable."));
        User nouveau = userRepository.findById(nouveauId)
                .filter(u -> u.getRole() == Role.FORMATEUR)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formateur invalide."));

        Set<User> anciens = new HashSet<>(centre.getFormateurs());
        if (anciens.stream().anyMatch(f -> f.getId().equals(nouveau.getId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce formateur est déjà assigné à ce centre.");
        }
        Set<Long> ancienIds = anciens.stream().map(User::getId).collect(Collectors.toSet());

        // Le nouveau ne peut avoir qu'une séance ouverte : s'il en a déjà une, on ne lui
        // en transfère pas une seconde (le Directeur doit d'abord la faire clôturer).
        List<SessionCours> ouvertes = sessionCoursRepository.findByCentreIdOrderByHeureDebutAsc(centreId).stream()
                .filter(s -> "EN_COURS".equals(s.getStatut())
                        && s.getFormateur() != null && ancienIds.contains(s.getFormateur().getId()))
                .toList();
        if (!ouvertes.isEmpty()
                && (ouvertes.size() > 1
                || !sessionCoursRepository.findByFormateurIdAndStatut(nouveau.getId(), "EN_COURS").isEmpty())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Le nouveau formateur a déjà une séance en cours : faites-la clôturer avant la passation.");
        }
        for (SessionCours session : ouvertes) {
            session.setFormateur(nouveau);
            sessionCoursRepository.save(session);
        }

        List<FormateurAgendaEntry> creneaux = agendaRepository.findByCentreId(centreId).stream()
                .filter(e -> e.getFormateur() != null && ancienIds.contains(e.getFormateur().getId()))
                .toList();
        for (FormateurAgendaEntry entree : creneaux) {
            entree.setFormateur(nouveau);
            agendaRepository.save(entree);
        }

        for (User ancien : anciens) {
            centre.getFormateurs().remove(ancien);
            if (ancien.getCentres() != null) {
                ancien.getCentres().removeIf(c -> c.getId().equals(centreId));
            }
            userRepository.save(ancien);
        }
        centre.getFormateurs().add(nouveau);
        if (nouveau.getCentres() == null) {
            nouveau.setCentres(new HashSet<>());
        }
        nouveau.getCentres().add(centre);
        centreRepository.save(centre);
        userRepository.save(nouveau);

        String ancienNom = anciens.stream().map(PassationFormateurService::nom).collect(Collectors.joining(", "));
        return new Resultat(ancienNom, nom(nouveau), ouvertes.size(), creneaux.size());
    }

    private static String nom(User u) {
        String complet = ((u.getPrenom() != null ? u.getPrenom() : "") + " " + (u.getNom() != null ? u.getNom() : "")).trim();
        return complet.isBlank() ? u.getEmail() : complet;
    }
}
