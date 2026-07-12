# Déploiement Railway — Smart Kids Academy (terrain)

Guide pour héberger l’API et le frontend sur [Railway](https://railway.app) en **mode terrain** (vrai déploiement, pas démo).

---

## Architecture

| Service Railway | Rôle |
|-----------------|------|
| **PostgreSQL** | Base de données |
| **API** | Backend Spring Boot (Dockerfile racine), profil `field` |
| **Frontend** | React (`frontend/`), build Nixpacks |

---

## 1. PostgreSQL

1. **+ New** → **Database** → **PostgreSQL** → attendre **Active**
2. Service **API** → **Variables** → **Add Reference** → PostgreSQL → **`DATABASE_URL`**
3. Supprimer toute variable `DB_HOST` mal saisie (`${DB_HOST}` en texte brut)

Le code convertit `DATABASE_URL` en `DB_HOST`, `DB_PORT`, etc. automatiquement.

---

## 2. API backend (Docker)

1. **New Service** → dépôt GitHub `nehemiahlab`
2. Railway utilise le `Dockerfile` à la racine
3. Variables **obligatoires** :

```env
SPRING_PROFILES_ACTIVE=field

# PostgreSQL via Add Reference → DATABASE_URL

JWT_SECRET=(64+ caractères aléatoires)
CORS_ORIGINS=https://VOTRE-FRONTEND.up.railway.app

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-compte@gmail.com
MAIL_PASSWORD=(mot de passe application Gmail)
MAIL_FROM=votre-compte@gmail.com
MAIL_OTP_FROM=votre-compte@gmail.com

APP_SEED_ENABLED=false
```

### Premier déploiement — créer le directeur

Pour le tout premier lancement (base vide), activez temporairement :

```env
APP_SEED_ENABLED=true
APP_SEED_DIRECTOR_EMAIL=director@votre-domaine.com
APP_SEED_DIRECTOR_PASSWORD=(mot de passe fort)
```

Redéployez → connectez-vous → repassez `APP_SEED_ENABLED=false` et redéployez.

> **Pas de `password123`** — ce profil n’injecte aucun compte démo automatique.

Modèle complet : [`railway.env.example`](railway.env.example)

---

## 3. Frontend

| Paramètre | Valeur |
|-----------|--------|
| **Root Directory** | `frontend` |
| `VITE_API_URL` | `https://VOTRE-API.up.railway.app/api` |

Build : `npm ci && npm run build`  
Start : `npm run start`

---

## 4. Profils Spring

| Profil | Usage |
|--------|-------|
| `field` | **Terrain / pilote Railway** — Flyway, pas de démo, stockage local |
| `prod` | Production complète avec S3/R2 obligatoire |
| `demo` | Présentation gratuite uniquement (Render/Neon) |

---

## 5. Checklist terrain

1. PostgreSQL **Active** + `DATABASE_URL` liée à l’API
2. `SPRING_PROFILES_ACTIVE=field`
3. `JWT_SECRET` (64+ caractères) et `CORS_ORIGINS` (URL HTTPS du frontend)
4. Variables **MAIL_*** configurées
5. `APP_SEED_ENABLED=false` (sauf 1er déploiement)
6. Frontend : `VITE_API_URL` + Root Directory `frontend`
7. Redéployer API puis frontend
8. Vérifier : `https://VOTRE-API.up.railway.app/api/actuator/health`

Les tables sont créées par **Flyway** au premier démarrage réussi.

---

## Test local

```powershell
cd C:\projets\nehemiahlab\backend
$env:SPRING_PROFILES_ACTIVE="local"
mvn spring-boot:run
```

```powershell
cd C:\projets\nehemiahlab\frontend
npm run dev
```

---

## Git ≠ secrets

- **GitHub** : code uniquement
- **Railway → Variables** : JWT, MAIL, DB
- **`backend/.env`** : local uniquement (gitignoré)

Le fichier `railway.toml` configure le healthcheck sur `/api/actuator/health`.
