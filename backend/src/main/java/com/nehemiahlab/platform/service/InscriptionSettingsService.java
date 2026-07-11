package com.nehemiahlab.platform.service;

import com.nehemiahlab.platform.model.PlatformSetting;
import com.nehemiahlab.platform.repository.PlatformSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class InscriptionSettingsService {

    public static final String KEY_INSCRIPTION_FORMATEURS = "INSCRIPTION_FORMATEURS_OUVERTE";

    @Autowired
    private PlatformSettingRepository platformSettingRepository;

    public boolean isInscriptionFormateursOuverte() {
        return platformSettingRepository.findById(KEY_INSCRIPTION_FORMATEURS)
                .map(s -> "true".equalsIgnoreCase(s.getValeur()))
                .orElse(false);
    }

    public boolean setInscriptionFormateursOuverte(boolean ouverte) {
        PlatformSetting setting = PlatformSetting.builder()
                .cle(KEY_INSCRIPTION_FORMATEURS)
                .valeur(ouverte ? "true" : "false")
                .build();
        platformSettingRepository.save(setting);
        return ouverte;
    }
}
