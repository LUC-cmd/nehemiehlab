package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.Centre;
import com.nehemiahlab.platform.model.Eleve;
import com.nehemiahlab.platform.model.EnfantProfile;
import com.nehemiahlab.platform.model.Role;
import com.nehemiahlab.platform.model.User;
import com.nehemiahlab.platform.repository.CentreRepository;
import com.nehemiahlab.platform.repository.EleveRepository;
import com.nehemiahlab.platform.repository.EnfantProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Source unique des règles d'accès territoriales.
 * Les permissions d'interface ne remplacent jamais ces contrôles serveur.
 */
@Service
public class CentreAccessService {

    private final CentreRepository centreRepository;
    private final EleveRepository eleveRepository;
    private final EnfantProfileRepository enfantProfileRepository;

    public CentreAccessService(
            CentreRepository centreRepository,
            EleveRepository eleveRepository,
            EnfantProfileRepository enfantProfileRepository
    ) {
        this.centreRepository = centreRepository;
        this.eleveRepository = eleveRepository;
        this.enfantProfileRepository = enfantProfileRepository;
    }

    public List<Centre> accessibleCentres(User user) {
        if (user == null) return List.of();
        return switch (user.getRole()) {
            case DIRECTEUR, COMPTABLE -> centreRepository.findAll();
            case FORMATEUR -> centreRepository.findByFormateurId(user.getId());
            case COORDINATEUR -> centreRepository.findByCoordinateur(user);
            case RESPONSABLE_CLUSTER -> clusterCentres(user.getAssignedCluster());
            default -> List.of();
        };
    }

    public List<Long> accessibleCentreIds(User user) {
        return accessibleCentres(user).stream().map(Centre::getId).toList();
    }

    public boolean canAccessCentre(User user, Long centreId) {
        if (user == null || centreId == null) return false;
        if (user.getRole() == Role.DIRECTEUR || user.getRole() == Role.COMPTABLE) return true;
        return accessibleCentreIds(user).contains(centreId);
    }

    public void requireCentreAccess(User user, Long centreId) {
        if (!canAccessCentre(user, centreId)) {
            throw forbidden();
        }
    }

    public boolean canAccessEleve(User user, Long eleveId) {
        if (user == null || eleveId == null) return false;
        if (user.getRole() == Role.PARENT) {
            return eleveId.equals(user.getEleveId());
        }
        return eleveRepository.findById(eleveId)
                .map(eleve -> eleve.getCentre() != null
                        && canAccessCentre(user, eleve.getCentre().getId()))
                .orElse(false);
    }

    public void requireEleveAccess(User user, Long eleveId) {
        if (!canAccessEleve(user, eleveId)) {
            throw forbidden();
        }
    }

    public boolean canModifyEleve(User user, Eleve eleve) {
        if (user == null || eleve == null || eleve.getCentre() == null) return false;
        if (user.getRole() == Role.DIRECTEUR) return true;
        return user.getRole() == Role.FORMATEUR
                && canAccessCentre(user, eleve.getCentre().getId());
    }

    public void requireEleveModification(User user, Eleve eleve) {
        if (!canModifyEleve(user, eleve)) {
            throw forbidden();
        }
    }

    public boolean canAccessEnfant(User user, EnfantProfile enfant) {
        if (user == null || enfant == null) return false;
        if (user.getRole() == Role.DIRECTEUR) return true;
        return enfant.getCentreId() != null && canAccessCentre(user, enfant.getCentreId());
    }

    public void requireEnfantAccess(User user, EnfantProfile enfant) {
        if (!canAccessEnfant(user, enfant)) {
            throw forbidden();
        }
    }

    public void requireDirectorOrAccountant(User user) {
        if (user == null || (user.getRole() != Role.DIRECTEUR && user.getRole() != Role.COMPTABLE)) {
            throw forbidden();
        }
    }

    public List<EnfantProfile> accessibleEnfants(User user) {
        if (user != null && user.getRole() == Role.DIRECTEUR) {
            return enfantProfileRepository.findAll();
        }
        Collection<Long> centreIds = accessibleCentreIds(user);
        return centreIds.isEmpty()
                ? List.of()
                : enfantProfileRepository.findByCentreIdIn(centreIds);
    }

    public List<Long> filterCentreIds(User user, Long centreId, String region, String cluster) {
        Set<Long> ids = new HashSet<>(accessibleCentreIds(user));
        if (centreId != null) ids.retainAll(Set.of(centreId));
        if (region != null && !region.isBlank()) {
            ids.retainAll(centreRepository.findByRegion(region).stream().map(Centre::getId).toList());
        }
        if (cluster != null && !cluster.isBlank()) {
            ids.retainAll(centreRepository.findByCluster(cluster).stream().map(Centre::getId).toList());
        }
        return ids.stream().sorted().toList();
    }

    public List<Centre> clusterCentres(String cluster) {
        if (cluster == null || cluster.isBlank()) {
            return List.of();
        }
        return centreRepository.findByCluster(cluster.trim());
    }

    public void requireCoordinateurSingleCentre(User coordinateur, Long targetCentreId) {
        if (coordinateur == null || coordinateur.getRole() != Role.COORDINATEUR) {
            throw forbidden();
        }
        List<Centre> existing = centreRepository.findByCoordinateur(coordinateur);
        boolean alreadyOnOther = existing.stream()
                .anyMatch(c -> targetCentreId == null || !c.getId().equals(targetCentreId));
        if (alreadyOnOther) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ce coordinateur est déjà affecté à un autre centre."
            );
        }
    }

    private static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès non autorisé à ce centre ou à cet enfant.");
    }
}
