package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.ResourceCategory;
import com.nehemiahlab.platform.model.RessourceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RessourceItemRepository extends JpaRepository<RessourceItem, Long> {
    List<RessourceItem> findByActifTrueOrderByUpdatedAtDesc();
    List<RessourceItem> findByActifTrueAndCategorieOrderByUpdatedAtDesc(ResourceCategory categorie);
}
