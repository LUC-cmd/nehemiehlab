package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.EnfantProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EnfantProfileRepository extends JpaRepository<EnfantProfile, Long> {
    List<EnfantProfile> findByActifTrueOrderByUpdatedAtDesc();
    List<EnfantProfile> findByCentreIdIn(Collection<Long> centreIds);
    Optional<EnfantProfile> findByEleveId(Long eleveId);
    Optional<EnfantProfile> findByPhotoUrl(String photoUrl);
}
