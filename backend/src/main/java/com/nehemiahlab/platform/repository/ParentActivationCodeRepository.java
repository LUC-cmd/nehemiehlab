package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ParentActivationCode;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface ParentActivationCodeRepository extends JpaRepository<ParentActivationCode, Long> {

    List<ParentActivationCode> findByEleveIdAndUsedAtIsNull(Long eleveId);

    List<ParentActivationCode> findByEleveId(Long eleveId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ParentActivationCode> findFirstByEleveIdAndUsedAtIsNullOrderByCreatedAtDesc(Long eleveId);
}
