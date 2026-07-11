package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.ParentActivationCode;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.ParentActivationCodeRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParentActivationServiceTest {

    @Mock
    private ParentActivationCodeRepository codeRepository;
    @Mock
    private EleveRepository eleveRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MatriculeService matriculeService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private ParentActivationService service;

    @BeforeEach
    void setUp() {
        service = new ParentActivationService(
                codeRepository,
                eleveRepository,
                userRepository,
                passwordEncoder,
                matriculeService
        );
    }

    @Test
    void activateCreatesParentWithChosenPassword() {
        Eleve eleve = Eleve.builder().id(5L).matricule("26SKA0487").nom("Koffi").prenom("Ama").build();
        String plainCode = "ABCD234567";
        ParentActivationCode stored = ParentActivationCode.builder()
                .eleveId(5L)
                .codeHash(passwordEncoder.encode(plainCode))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        when(matriculeService.normalize("26SKA0487")).thenReturn("26SKA0487");
        when(matriculeService.isValidFormat("26SKA0487")).thenReturn(true);
        when(eleveRepository.findByMatriculeIgnoreCase("26SKA0487")).thenReturn(Optional.of(eleve));
        when(codeRepository.findFirstByEleveIdAndUsedAtIsNullOrderByCreatedAtDesc(5L))
                .thenReturn(Optional.of(stored));
        when(userRepository.findByEmail("parent.26ska0487@ska.local")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ParentActivationService.ActivationOutcome outcome = service.activate(
                "26SKA0487",
                plainCode,
                "MotDePasse9!"
        );

        assertTrue(outcome.success());
        assertEquals(Role.PARENT, outcome.user().getRole());
        assertTrue(outcome.user().isParentCredentialsActivated());
        assertTrue(passwordEncoder.matches("MotDePasse9!", outcome.user().getMotDePasse()));

        ArgumentCaptor<ParentActivationCode> codeCaptor = ArgumentCaptor.forClass(ParentActivationCode.class);
        verify(codeRepository).save(codeCaptor.capture());
        assertNotNull(codeCaptor.getValue().getUsedAt());
    }

    @Test
    void activateRejectsExpiredCode() {
        Eleve eleve = Eleve.builder().id(5L).matricule("26SKA0487").build();
        ParentActivationCode stored = ParentActivationCode.builder()
                .eleveId(5L)
                .codeHash(passwordEncoder.encode("ABCD234567"))
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .build();

        when(matriculeService.normalize("26SKA0487")).thenReturn("26SKA0487");
        when(matriculeService.isValidFormat("26SKA0487")).thenReturn(true);
        when(eleveRepository.findByMatriculeIgnoreCase("26SKA0487")).thenReturn(Optional.of(eleve));
        when(codeRepository.findFirstByEleveIdAndUsedAtIsNullOrderByCreatedAtDesc(5L))
                .thenReturn(Optional.of(stored));

        ParentActivationService.ActivationOutcome outcome = service.activate(
                "26SKA0487",
                "ABCD234567",
                "MotDePasse9!"
        );

        assertFalse(outcome.success());
        verify(userRepository, never()).save(any());
    }
}
