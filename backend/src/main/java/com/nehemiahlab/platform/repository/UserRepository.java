package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByRole(Role role);
    List<User> findByRoleAndActifTrue(Role role);
    List<User> findByRoleAndActifFalseOrderByCreatedAtDesc(Role role);
    List<User> findByRoleOrderByCreatedAtDesc(Role role);
    boolean existsByEmail(String email);
    List<User> findByEleveId(Long eleveId);
}
