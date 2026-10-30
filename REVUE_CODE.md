# Revue de code — NehemiahLab / Smart Kids Academy

*Revue du 13/07/2026 — dépôt `LUC-cmd/nehemiehlab`, branche `main` (commit `4ff5b74`)*

## Vue d'ensemble

Plateforme Spring Boot 3.2.3 (Java 17, ~15 000 lignes) + React/Vite/TypeScript (~27 000 lignes). Architecture backend en couches classiques (controller / service / repository / model / security / config), frontend organisé par pages et composants avec Zustand et React Router. PostgreSQL, Flyway en production, stockage fichiers local ou S3, déploiement Railway/Render via Docker.

Le niveau général est bon, nettement au-dessus de la moyenne pour un projet de cette taille : la sécurité a visiblement été travaillée sérieusement. Les points faibles principaux sont la couverture de tests, la taille de certains fichiers et la configuration CORS éclatée.

## Points forts

La sécurité backend est solide. Les mots de passe sont hachés en BCrypt (force 12) avec une politique de mot de passe dédiée. Le JWT impose un secret d'au moins 32 octets, distingue les tokens access/refresh par claim `typ`, et les sessions de refresh sont persistées en base (révocables). Un rate limiting protège `/auth` (20 tentatives / 15 min). Les en-têtes de sécurité sont complets (CSP, HSTS, X-Frame-Options deny, Referrer-Policy). Les fichiers sensibles (CNI, justificatifs, photos d'enfants) passent par `/secure-files` avec contrôle du propriétaire/centre, protection contre le path traversal (`normalize` + `startsWith(root)` + rejet de `..`) et vérification des magic bytes. Les routes `/uploads` sensibles sont explicitement en `denyAll`.

L'autorisation est systématique : la quasi-totalité des endpoints porte `@PreAuthorize`, et les contrôleurs sans annotation (RapportController, SecureFileController) font des contrôles internes via `CentreAccessService` (`requireCentreAccess`, `requireEleveAccess`) en plus du `anyRequest().authenticated()` global.

Côté configuration : aucun secret commité (`.env` bien ignoré), profil `prod` avec Flyway + `ddl-auto=validate` et validateurs qui font échouer le démarrage si une variable critique manque. La CI vérifie les secrets, lance les tests, audite les dépendances npm et scanne l'image Docker (non-root).

Le frontend est propre : TypeScript strict, zéro `any`, zéro `console.log`, zéro `dangerouslySetInnerHTML`, refresh token géré par intercepteur axios.

## Points à corriger

### Priorité haute

**1. Tokens JWT en localStorage + durée de vie de 24 h.** L'access token vit 24 h (`security.jwt.expiration-time=86400000`) et est stocké en localStorage (`authStorage.ts`) : une seule faille XSS donne un accès complet pendant 24 h, sur une plateforme qui gère des données d'enfants. Réduire l'access token à 15–60 min (le refresh de 7 jours compense), et idéalement passer le refresh token en cookie httpOnly.

**2. Couverture de tests très faible.** 6 classes de test backend pour 15 000 lignes, zéro test frontend. Les zones critiques non testées : `CentreAccessService` (partiellement), les contrôleurs de rapports, le flux refresh token, l'activation parent. C'est le risque n°1 de régression, surtout vu le rythme de commits correctifs récents.

**3. CORS éclaté sur 4+ classes.** `PlatformCorsConfiguration`, `PlatformCorsFilterConfig` (filtre custom), `WebConfig` (MVC), `CorsConfigurationLogger`, plus les classes Railway — alors que `SecurityConfig` fait `cors(disable)`. C'est la cause directe de la série de 7 commits de correctifs CORS des derniers jours. Consolider en une seule source (le `CorsConfigurationSource` de Spring Security) et supprimer le reste.

### Priorité moyenne

**4. `ddl-auto=update` hors production.** Le profil par défaut et les profils `demo`/`field` utilisent `update` avec Flyway désactivé. Si un environnement réel démarre sans `SPRING_PROFILES_ACTIVE=prod`, Hibernate modifie le schéma silencieusement. Envisager `validate` + Flyway partout sauf `local`.

**5. Pas de couche DTO.** Les entités JPA sont sérialisées directement (0 fichier dans `dto/`). Risque d'exposer des champs par accident (chaque ajout de colonne devient public par défaut) et problèmes de lazy loading. Introduire des DTO au moins pour `User`, `Eleve`, `EnfantProfile`.

**6. Fichiers géants.** `RapportController` : 1 879 lignes ; `SessionsPage.tsx` : 1 543 lignes ; `CentresPage.tsx` : 1 418 lignes ; `api.ts` : 802 lignes. À découper (un contrôleur par domaine de rapport, extraction de hooks/sous-composants côté React).

**7. Limites d'upload élevées.** 100 MB/fichier, 200 MB/requête, globalement. Descendre à ce qui est réellement nécessaire par type (photos : 10 MB suffisent) pour limiter l'abus.

### Priorité basse

**8. Rate limiting en mémoire.** `AuthRateLimitFilter` utilise une map en mémoire : inefficace si plusieurs instances derrière un load balancer. Acceptable aujourd'hui (instance unique Railway), à revoir si scaling.

**9. Fins de ligne non normalisées.** Les 242 fichiers apparaissent modifiés sous Windows (CRLF/LF). Ajouter un `.gitattributes` avec `* text=auto`.

**10. README encodé en UTF-16.** Illisible sur GitHub et dans plusieurs outils. Réenregistrer en UTF-8.

**11. Logique Railway dans le code.** `RailwayEnvironmentPostProcessor`, `RailwayDatabaseEnvironment`, etc. : de la config spécifique hébergeur vit dans le code applicatif. Fonctionnel, mais à isoler (profil dédié ou variables d'env pures) pour ne pas coupler l'app à Railway.

## Récapitulatif

| # | Constat | Priorité | Effort |
|---|---------|----------|--------|
| 1 | JWT 24 h en localStorage | Haute | Faible |
| 2 | Couverture de tests | Haute | Élevé |
| 3 | CORS éclaté (source des bugs récents) | Haute | Moyen |
| 4 | `ddl-auto=update` hors prod | Moyenne | Faible |
| 5 | Absence de DTO | Moyenne | Moyen |
| 6 | Fichiers de 1 400–1 900 lignes | Moyenne | Moyen |
| 7 | Uploads 100/200 MB | Moyenne | Faible |
| 8 | Rate limit en mémoire | Basse | Moyen |
| 9 | `.gitattributes` manquant | Basse | Trivial |
| 10 | README en UTF-16 | Basse | Trivial |
| 11 | Config Railway dans le code | Basse | Moyen |
