package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.CommunityProfile;
import com.nehemiahlab.platform.model.CommunityProfileType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommunityProfileRepository extends JpaRepository<CommunityProfile, Long> {
    List<CommunityProfile> findByActifTrueOrderByUpdatedAtDesc();
    List<CommunityProfile> findByActifTrueAndTypeOrderByUpdatedAtDesc(CommunityProfileType type);
    Optional<CommunityProfile> findByUserId(Long userId);
}
