package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.EnfantProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CentreAccessServiceTest {

    @Mock
    private CentreRepository centreRepository;
    @Mock
    private EleveRepository eleveRepository;
    @Mock
    private EnfantProfileRepository enfantProfileRepository;

    private CentreAccessService service;

    @BeforeEach
    void setUp() {
        service = new CentreAccessService(centreRepository, eleveRepository, enfantProfileRepository);
    }

    @Test
    void parentCanOnlyReadLinkedStudent() {
        User parent = User.builder().id(7L).role(Role.PARENT).eleveId(42L).build();

        assertTrue(service.canAccessEleve(parent, 42L));
        assertFalse(service.canAccessEleve(parent, 43L));
        assertFalse(service.canAccessCentre(parent, 1L));
    }

    @Test
    void trainerCannotReadStudentFromAnotherCentre() {
        User trainer = User.builder().id(8L).role(Role.FORMATEUR).build();
        Centre assigned = Centre.builder().id(10L).build();
        Centre foreign = Centre.builder().id(11L).build();
        Eleve foreignStudent = Eleve.builder().id(55L).centre(foreign).build();
        when(centreRepository.findByFormateurId(8L)).thenReturn(List.of(assigned));
        when(eleveRepository.findById(55L)).thenReturn(Optional.of(foreignStudent));

        assertFalse(service.canAccessEleve(trainer, 55L));
        assertTrue(service.canAccessCentre(trainer, 10L));
    }

    @Test
    void requireDirectorOrAccountantBlocksTrainer() {
        User trainer = User.builder().id(3L).role(Role.FORMATEUR).build();
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.requireDirectorOrAccountant(trainer));
    }

    @Test
    void clusterManagerSeesAllCentresInAssignedCluster() {
        User responsable = User.builder()
                .id(9L)
                .role(Role.RESPONSABLE_CLUSTER)
                .assignedCluster("Cluster Lomé Est")
                .build();
        Centre c1 = Centre.builder().id(1L).cluster("Cluster Lomé Est").build();
        Centre c2 = Centre.builder().id(2L).cluster("Cluster Lomé Est").build();
        when(centreRepository.findByCluster("Cluster Lomé Est")).thenReturn(List.of(c1, c2));

        assertTrue(service.canAccessCentre(responsable, 1L));
        assertTrue(service.canAccessCentre(responsable, 2L));
        assertFalse(service.canAccessCentre(responsable, 99L));
    }

    @Test
    void coordinatorSeesOnlyAssignedCentre() {
        User coord = User.builder().id(10L).role(Role.COORDINATEUR).build();
        Centre mine = Centre.builder().id(5L).build();
        when(centreRepository.findByCoordinateur(coord)).thenReturn(List.of(mine));

        assertTrue(service.canAccessCentre(coord, 5L));
        assertFalse(service.canAccessCentre(coord, 6L));
    }
}
