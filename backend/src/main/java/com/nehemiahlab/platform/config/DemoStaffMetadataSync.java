package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Local / demo : répare les comptes responsables cluster (rôle + cluster assigné).
 */
@Component
@Profile({"local", "demo"})
@Order(1001)
public class DemoStaffMetadataSync implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoStaffMetadataSync.class);

    private static final Map<String, String> RESPONSABLE_CLUSTERS = Map.ofEntries(
            Map.entry("resp1@ska.tg", "Cluster Lomé Est"),
            Map.entry("resp2@ska.tg", "Cluster Maritime Ouest"),
            Map.entry("resp3@ska.tg", "Cluster Kpalimé"),
            Map.entry("resp4@ska.tg", "Cluster Atakpamé"),
            Map.entry("resp5@ska.tg", "Cluster Sokodé"),
            Map.entry("resp6@ska.tg", "Cluster Centrale Est"),
            Map.entry("resp7@ska.tg", "Cluster Kara Ville"),
            Map.entry("resp8@ska.tg", "Cluster Kara Nord"),
            Map.entry("resp9@ska.tg", "Cluster Dapaong"),
            Map.entry("resp10@ska.tg", "Cluster Mango")
    );

    @Value("${app.seed.demo-password:password123}")
    private String demoPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoStaffMetadataSync(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (demoPassword.isBlank()) return;
        String encoded = passwordEncoder.encode(demoPassword);
        int fixed = 0;
        for (var entry : RESPONSABLE_CLUSTERS.entrySet()) {
            fixed += userRepository.findByEmailIgnoreCase(entry.getKey())
                    .map(user -> repairResponsable(user, entry.getValue(), encoded))
                    .orElse(0);
        }
        if (fixed > 0) {
            log.info("Métadonnées responsables cluster synchronisées ({} compte(s)).", fixed);
        }
    }

    private int repairResponsable(User user, String cluster, String encodedPassword) {
        user.setRole(Role.RESPONSABLE_CLUSTER);
        user.setAssignedCluster(cluster);
        user.setActif(true);
        user.setMotDePasse(encodedPassword);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        return 1;
    }
}
