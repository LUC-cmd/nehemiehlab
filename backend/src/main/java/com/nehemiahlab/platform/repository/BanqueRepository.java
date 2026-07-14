package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Banque;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BanqueRepository extends JpaRepository<Banque, Long> {
    boolean existsByNomIgnoreCase(String nom);
}
