package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Cluster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClusterRepository extends JpaRepository<Cluster, Long> {
    List<Cluster> findAllByOrderByNomAsc();
    Optional<Cluster> findByNomIgnoreCase(String nom);
}
