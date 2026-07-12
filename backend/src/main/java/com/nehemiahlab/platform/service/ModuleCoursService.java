package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.ModuleCours;
import com.nehemiahlab.platform.repository.ModuleCoursRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ModuleCoursService {

    private final ModuleCoursRepository moduleCoursRepository;

    public ModuleCoursService(ModuleCoursRepository moduleCoursRepository) {
        this.moduleCoursRepository = moduleCoursRepository;
    }

    public ModuleCours requireActive(Long moduleCoursId) {
        if (moduleCoursId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Veuillez sélectionner un module du catalogue.");
        }
        ModuleCours module = moduleCoursRepository.findById(moduleCoursId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Module introuvable."));
        if (!module.isActif()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce module n'est plus disponible.");
        }
        return module;
    }
}
