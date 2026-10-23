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
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PassationFormateurServiceTest {

    private final CentreRepository centreRepository = mock(CentreRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SessionCoursRepository sessionRepository = mock(SessionCoursRepository.class);
    private final FormateurAgendaEntryRepository agendaRepository = mock(FormateurAgendaEntryRepository.class);
    private final PassationFormateurService service =
            new PassationFormateurService(centreRepository, userRepository, sessionRepository, agendaRepository);

    private final User ancien = User.builder().id(1L).prenom("Ama").nom("Kodjo").role(Role.FORMATEUR).build();
    private final User nouveau = User.builder().id(2L).prenom("Yao").nom("Mensah").role(Role.FORMATEUR).build();
    private final Centre centre = Centre.builder().id(10L).nom("Anié").build();

    private void donnees(List<SessionCours> sessionsCentre, List<SessionCours> ouvertesNouveau) {
        centre.setFormateurs(new HashSet<>(List.of(ancien)));
        ancien.setCentres(new HashSet<>(List.of(centre)));
        when(centreRepository.findById(10L)).thenReturn(Optional.of(centre));
        when(userRepository.findById(2L)).thenReturn(Optional.of(nouveau));
        when(sessionRepository.findByCentreIdOrderByHeureDebutAsc(10L)).thenReturn(sessionsCentre);
        when(sessionRepository.findByFormateurIdAndStatut(2L, "EN_COURS")).thenReturn(ouvertesNouveau);
    }

    @Test
    void leNouveauReprendSeanceOuverteEtAgendaMaisPasLesSeancesCloturees() {
        SessionCours ouverte = SessionCours.builder().id(100L).statut("EN_COURS").centre(centre).formateur(ancien).build();
        SessionCours cloturee = SessionCours.builder().id(101L).statut("CLOTUREE").centre(centre).formateur(ancien).build();
        FormateurAgendaEntry creneau = FormateurAgendaEntry.builder().id(5L).centre(centre).formateur(ancien).build();
        donnees(List.of(cloturee, ouverte), List.of());
        when(agendaRepository.findByCentreId(10L)).thenReturn(List.of(creneau));

        PassationFormateurService.Resultat r = service.remplacer(10L, 2L);

        assertEquals(1, r.seancesReprises());
        assertEquals(1, r.creneauxRepris());
        assertSame(nouveau, ouverte.getFormateur());
        assertSame(ancien, cloturee.getFormateur());
        assertSame(nouveau, creneau.getFormateur());
        assertEquals(java.util.Set.of(nouveau), centre.getFormateurs());
        assertTrue(ancien.getCentres().isEmpty());
    }

    @Test
    void refuseSiLeNouveauADejaUneSeanceOuverte() {
        SessionCours ouverte = SessionCours.builder().id(100L).statut("EN_COURS").centre(centre).formateur(ancien).build();
        SessionCours sienne = SessionCours.builder().id(200L).statut("EN_COURS").formateur(nouveau).build();
        donnees(List.of(ouverte), List.of(sienne));

        assertThrows(ResponseStatusException.class, () -> service.remplacer(10L, 2L));
        assertSame(ancien, ouverte.getFormateur());
        assertTrue(centre.getFormateurs().contains(ancien));
    }
}
