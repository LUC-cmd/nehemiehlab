package com.nehemiahlab.platform.repository;

import com.nehemiahlab.platform.model.PlatformSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, String> {
}
