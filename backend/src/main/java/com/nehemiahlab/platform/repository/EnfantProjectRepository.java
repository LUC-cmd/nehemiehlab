package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.EnfantProject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EnfantProjectRepository extends JpaRepository<EnfantProject, Long> {
    Optional<EnfantProject> findByMediaUrl(String mediaUrl);
}
