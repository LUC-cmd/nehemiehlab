# Hébergement gratuit pour présentation

Guide pour déployer **Smart Kids Academy** gratuitement avant de passer à un hébergement payant.

## Architecture recommandée (0 €)

| Composant | Service | Limite gratuite |
|-----------|---------|-----------------|
| Base PostgreSQL | [Neon](https://neon.tech) | 0,5 Go, toujours actif |
| API backend | [Render](https://render.com) Web Service (Docker) | S’endort après 15 min d’inactivité |
| Site React | [Render](https://render.com) Static Site | Gratuit, CDN inclus |

> **Important :** sur le plan gratuit Render, la première requête après inactivité peut prendre **30 à 60 secondes** (réveil du serveur). Prévoyez d’ouvrir le lien **5 minutes avant** votre présentation.

---

## Étape 1 — Base de données Neon (gratuit)

1. Créez un compte sur [neon.tech](https://neon.tech).
2. **New Project** → région proche (ex. `Frankfurt`).
3. Notez les identifiants de connexion :
   - `DB_HOST` (ex. `ep-xxx.eu-central-1.aws.neon.tech`)
   - `DB_NAME` (ex. `neondb`)
   - `DB_USER`
   - `DB_PASSWORD`

---

## Étape 2 — Déployer sur Render

### Option A — Blueprint (recommandé)

1. Allez sur [dashboard.render.com](https://dashboard.render.com).
2. **New** → **Blueprint**.
3. Connectez le dépôt GitHub : `https://github.com/LUC-cmd/nehemiehlab`.
4. Render détecte `render.yaml` et propose 2 services.
5. Renseignez les variables marquées **sync: false** :

#### Service `nehemiahlab-api`

| Variable | Valeur |
|----------|--------|
| `DB_HOST` | Hôte Neon |
| `DB_NAME` | Nom de la base Neon |
| `DB_USER` | Utilisateur Neon |
| `DB_PASSWORD` | Mot de passe Neon |
| `CORS_ORIGINS` | URL HTTPS du frontend Render (voir étape 3) |

`JWT_SECRET` est généré automatiquement par Render.

#### Service `nehemiahlab-web`

| Variable | Valeur |
|----------|--------|
| `VITE_API_URL` | `https://nehemiahlab-api.onrender.com/api` |

(Remplacez par l’URL réelle de votre service API une fois créé.)

6. **Apply** et attendez le premier déploiement (~10 min).

### Option B — Manuel

**Backend (Docker)**  
- Runtime : Docker  
- Dockerfile : racine du dépôt  
- Health check : `/api/actuator/health`  
- `SPRING_PROFILES_ACTIVE=demo`  

**Frontend (Static Site)**  
- Root : `frontend`  
- Build : `npm ci && npm run build`  
- Publish : `dist`  
- Variable : `VITE_API_URL=https://VOTRE-API.onrender.com/api`  

---

## Étape 3 — Finaliser CORS

1. Une fois le site statique déployé, copiez son URL (ex. `https://nehemiahlab-web.onrender.com`).
2. Dans le service **nehemiahlab-api**, mettez à jour :
   ```
   CORS_ORIGINS=https://nehemiahlab-web.onrender.com
   ```
3. Redéployez l’API si nécessaire.

---

## Comptes de démonstration

Mot de passe pour tous : **`password123`**

| Rôle | Exemple |
|------|---------|
| Directeur | `director@nehemiahlab.com` |
| Responsable cluster | `resp1@ska.tg` … `resp10@ska.tg` |
| Coordinateur | `coord1@ska.tg` … `coord50@ska.tg` |
| Formateur | `form1@ska.tg` … `form20@ska.tg` |

Les données sont créées automatiquement au premier démarrage (`APP_SEED_ENABLED=true`).

---

## Vérification

1. Ouvrez `https://VOTRE-WEB.onrender.com` — attendez le chargement.
2. Page **Connexion** → `director@nehemiahlab.com` / `password123`.
3. Santé API : `https://VOTRE-API.onrender.com/api/actuator/health` → `{"status":"UP"}`.

---

## Limites du mode gratuit (présentation)

- **Cold start** Render : 30–60 s après inactivité.
- **Fichiers uploadés** : stockage local éphémère (perdus au redémarrage).
- **E-mails** : non envoyés sans SMTP configuré (connexion et dashboards OK).
- **Neon** : 0,5 Go — suffisant pour la démo Togo.

---

## Passer à la version payante (après la présentation)

1. **Render** : passer le Web Service en plan **Starter** (~7 $/mois) — plus de cold start.
2. **Profil `prod`** : `SPRING_PROFILES_ACTIVE=prod` avec :
   - Cloudflare R2 ou AWS S3 (`STORAGE_*`)
   - SMTP réel (`MAIL_*`)
   - Flyway activé (`application-prod.properties`)
   - `APP_SEED_ENABLED=false`
3. **Neon** : plan Scale si la base dépasse 0,5 Go.
4. **Domaine personnalisé** : `ska.nehemiahlab.com` sur Render + CORS mis à jour.

Voir `README.md` pour la checklist production complète.
