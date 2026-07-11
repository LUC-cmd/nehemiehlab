package com.nehemiahlab.platform.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "platform_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformSetting {

    @Id
    @Column(length = 100)
    private String cle;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String valeur;
}
