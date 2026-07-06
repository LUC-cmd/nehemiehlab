package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CentreRepository extends JpaRepository<Centre, Long> {
    List<Centre> findByCoordinateur(User coordinateur);
    
    @Query("SELECT c FROM Centre c JOIN c.formateurs f WHERE f.id = :formateurId")
    List<Centre> findByFormateurId(@Param("formateurId") Long formateurId);
}
