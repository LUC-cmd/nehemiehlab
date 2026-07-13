package com.nehemiahlab.platform.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate ddl-auto=update ne met pas à jour les CHECK constraints PostgreSQL.
 * Ce correctif s'exécute au démarrage lorsque Flyway est désactivé (profils local/demo).
 */
@Component
@Profile({"local", "demo", "field"})
@Order(500)
public class UserRoleConstraintPatch implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UserRoleConstraintPatch.class);

    private final JdbcTemplate jdbcTemplate;

    public UserRoleConstraintPatch(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute("""
                    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
                        'DIRECTEUR',
                        'FORMATEUR',
                        'COORDINATEUR',
                        'RESPONSABLE_CLUSTER',
                        'COMPTABLE',
                        'STAFF_NEHEMIAH',
                        'ANIMATEUR',
                        'PARENT',
                        'BENEVOLE',
                        'PARTICIPANT'
                    ))
                    """);
            log.debug("Contrainte users_role_check mise à jour (RESPONSABLE_CLUSTER inclus).");
        } catch (Exception e) {
            log.warn("Impossible de mettre à jour users_role_check: {}", e.getMessage());
        }
    }
}
