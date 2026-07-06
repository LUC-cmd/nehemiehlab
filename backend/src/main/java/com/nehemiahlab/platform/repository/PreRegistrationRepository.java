package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.PreRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PreRegistrationRepository extends JpaRepository<PreRegistration, Long> {
    Optional<PreRegistration> findByNomIgnoreCaseAndPrenomIgnoreCaseAndEmailIgnoreCaseAndUtiliseFalse(
        String nom, String prenom, String email
    );
    boolean existsByEmail(String email);
}
