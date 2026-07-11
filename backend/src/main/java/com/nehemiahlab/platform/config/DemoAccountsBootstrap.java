package com.nehemiahlab.platform.config;

import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Local / demo : tous les comptes de démonstration fonctionnels (staff + parents).
 */
@Component
@Profile({"local", "demo"})
@Order(1001)
public class DemoAccountsBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoAccountsBootstrap.class);

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

    private static final List<String> DEMO_PARENT_MATRICULES = List.of(
            "26SKA0001", "26SKA0002", "26SKA0003", "26SKA0004", "26SKA0005"
    );

    private static final List<StaffDef> DIRECTEUR_CREATED_STAFF = List.of(
            new StaffDef("compta@ska.tg", Role.COMPTABLE, "Agbéko", "Afi"),
            new StaffDef("staff@ska.tg", Role.STAFF_NEHEMIAH, "Mensah", "Koffi"),
            new StaffDef("animateur@ska.tg", Role.ANIMATEUR, "Lawson", "Edem"),
            new StaffDef("benevole@ska.tg", Role.BENEVOLE, "Adjo", "Mawuli"),
            new StaffDef("participant@ska.tg", Role.PARTICIPANT, "Tamakloe", "Sena")
    );

    @Value("${app.seed.demo-password:password123}")
    private String demoPassword;

    private final UserRepository userRepository;
    private final EleveRepository eleveRepository;
    private final CentreRepository centreRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoAccountsBootstrap(
            UserRepository userRepository,
            EleveRepository eleveRepository,
            CentreRepository centreRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.eleveRepository = eleveRepository;
        this.centreRepository = centreRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (demoPassword.isBlank()) {
            return;
        }
        String encoded = passwordEncoder.encode(demoPassword);
        int staffSynced = syncAllSkaStaff(encoded);
        int responsables = ensureResponsables(encoded);
        int directorRoles = ensureDirectorCreatedStaff(encoded);
        int parents = ensureDemoParents(encoded);
        log.info(
                "Comptes démo prêts — staff @ska.tg: {}, responsables: {}, rôles directeur: {}, parents: {}",
                staffSynced, responsables, directorRoles, parents
        );
    }

    private int syncAllSkaStaff(String encodedPassword) {
        int count = 0;
        for (User user : userRepository.findAll()) {
            String email = user.getEmail();
            if (email == null || !email.toLowerCase(Locale.ROOT).endsWith("@ska.tg")) {
                continue;
            }
            if (user.getRole() == Role.PARENT) {
                continue;
            }
            applyStaffCredentials(user, encodedPassword);
            count++;
        }
        return count;
    }

    private int ensureResponsables(String encodedPassword) {
        int count = 0;
        for (var entry : RESPONSABLE_CLUSTERS.entrySet()) {
            String email = entry.getKey();
            String cluster = entry.getValue();
            User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
                String num = email.replaceAll("\\D+", "");
                int idx = num.isEmpty() ? 0 : Integer.parseInt(num);
                return userRepository.save(User.builder()
                        .email(email)
                        .nom("Responsable " + num)
                        .prenom(cluster.replace("Cluster ", ""))
                        .role(Role.RESPONSABLE_CLUSTER)
                        .telephone("+228 90 00 00 " + String.format("%02d", idx))
                        .actif(true)
                        .build());
            });
            user.setRole(Role.RESPONSABLE_CLUSTER);
            user.setAssignedCluster(cluster);
            applyStaffCredentials(user, encodedPassword);
            count++;
        }
        return count;
    }

    private int ensureDirectorCreatedStaff(String encodedPassword) {
        int count = 0;
        for (StaffDef def : DIRECTEUR_CREATED_STAFF) {
            final int phoneSuffix = count;
            User user = userRepository.findByEmailIgnoreCase(def.email()).orElseGet(() ->
                    userRepository.save(User.builder()
                            .email(def.email())
                            .nom(def.nom())
                            .prenom(def.prenom())
                            .role(def.role())
                            .telephone("+228 91 00 00 0" + phoneSuffix)
                            .actif(true)
                            .build())
            );
            user.setRole(def.role());
            applyStaffCredentials(user, encodedPassword);
            count++;
        }
        return count;
    }

    private int ensureDemoParents(String encodedPassword) {
        var centreOpt = centreRepository.findByNomIgnoreCase("SKA Lomé Bè");
        if (centreOpt.isEmpty()) {
            log.warn("Centre « SKA Lomé Bè » absent — comptes parents démo non créés (lancez APP_SEED_ENABLED=true).");
            return 0;
        }
        List<Eleve> eleves = eleveRepository.findByCentreId(centreOpt.get().getId());
        if (eleves.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (int i = 0; i < DEMO_PARENT_MATRICULES.size() && i < eleves.size(); i++) {
            String matricule = DEMO_PARENT_MATRICULES.get(i);
            Eleve eleve = eleves.get(i);
            final Long eleveId = eleve.getId();

            eleveRepository.findByMatriculeIgnoreCase(matricule).ifPresent(other -> {
                if (!other.getId().equals(eleveId)) {
                    other.setMatricule("26SKA" + String.format(Locale.ROOT, "%04d", 8000 + other.getId().intValue() % 1000));
                    eleveRepository.save(other);
                }
            });

            eleve.setMatricule(matricule);
            eleveRepository.save(eleve);

            String parentEmail = parentEmailFor(matricule);
            User parent = userRepository.findByEmailIgnoreCase(parentEmail).orElseGet(() ->
                    User.builder()
                            .email(parentEmail)
                            .nom(eleve.getNom())
                            .prenom("Parent de " + eleve.getPrenom())
                            .role(Role.PARENT)
                            .build()
            );
            parent.setRole(Role.PARENT);
            parent.setEleveId(eleve.getId());
            parent.setParentCredentialsActivated(true);
            parent.setActif(true);
            parent.setMotDePasse(encodedPassword);
            parent.setFailedLoginAttempts(0);
            parent.setLockedUntil(null);
            userRepository.save(parent);
            count++;
        }
        return count;
    }

    private void applyStaffCredentials(User user, String encodedPassword) {
        user.setMotDePasse(encodedPassword);
        user.setActif(true);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    static String parentEmailFor(String matricule) {
        return "parent." + matricule.toLowerCase(Locale.ROOT) + "@ska.local";
    }

    private record StaffDef(String email, Role role, String nom, String prenom) {}
}
