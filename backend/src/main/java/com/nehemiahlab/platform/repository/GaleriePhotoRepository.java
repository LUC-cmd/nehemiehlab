package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.GaleriePhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GaleriePhotoRepository extends JpaRepository<GaleriePhoto, Long> {

    List<GaleriePhoto> findByActifTrueOrderByOrdreAscCreatedAtDesc();

    List<GaleriePhoto> findAllByOrderByOrdreAscCreatedAtDesc();
}
