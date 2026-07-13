# Déploiement Railway — Smart Kids Academy (terrain)

Guide pour héberger l'API et le frontend sur [Railway](https://railway.app) en **mode terrain** (vrai déploiement, pas démo).

**Domaine production :** `ska-management.com` / `api.ska-management.com`

---

## Architecture

| Service Railway | Rôle | URL |
|-----------------|------|-----|
| **PostgreSQL** | Base de données | interne |
| **nehemiahlab-api** | Backend Spring Boot (Dockerfile racine), profil `field` | `https://api.ska-management.com` |
| **nehemiahlab-web** | Frontend React (`frontend/`) | `https://ska-management.com` |

---

## 1. PostgreSQL

1. **+ New** → **Database** → **PostgreSQL** → attendre **Active**
2. **nehemiahlab-api** → **Variables** → **Add Reference** → PostgreSQL → **`DATABASE_URL`**
3. Supprimer toute variable `DB_*` ou `PG*` saisie à la main

---

## 2. API (nehemiahlab-api)

### Settings

| Paramètre | Valeur |
|-----------|--------|
| **Root Directory** | *(vide)* |
| **Build / Start Command** | *(vide)* |
| **Port domaine custom** | **8080** |

### Variables obligatoires

```env
SPRING_PROFILES_ACTIVE=field

JWT_SECRET=(64+ caractères aléatoires)

APP_PLATFORM_URL=https://ska-management.com
CORS_ORIGINS=https://ska-management.com,https://www.ska-management.com

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-compte@gmail.com
MAIL_PASSWORD=(mot de passe application Gmail, sans espace)
MAIL_FROM=votre-compte@gmail.com
MAIL_OTP_FROM=votre-compte@gmail.com

APP_SEED_ENABLED=true
APP_SEED_DIRECTOR_EMAIL=contact@nehemiahlab.com
APP_SEED_DIRECTOR_PASSWORD=(mot de passe fort)
```

Après première connexion : `APP_SEED_ENABLED=false` puis redéployer.

### Si « Needs approval »

**nehemiahlab-api** → **Deployments** → **Approve** / **Deploy**.

### Logs attendus

```
PostgreSQL Railway : host=postgres.railway.internal ...
CORS configuré pour: https://ska-management.com,...
SMTP configure — envoi d'emails actif
```

---

## 3. Frontend (nehemiahlab-web)

| Paramètre | Valeur |
|-----------|--------|
| **Root Directory** | `frontend` |
| **Build / Start Command** | *(vide)* |
| **Port domaine custom** | **4173** |
| `VITE_API_URL` | `https://api.ska-management.com/api` |

Ne pas mettre `DATABASE_URL`, `JWT_SECRET` ou `MAIL_*` sur le frontend.

---

## 4. Checklist

1. PostgreSQL **Active** + `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
2. API **Active** (pas « Needs approval »)
3. `APP_PLATFORM_URL` + `CORS_ORIGINS` sur l'API
4. Frontend `VITE_API_URL` correct + redéployé
5. Health : `https://api.ska-management.com/api/actuator/health` → UP
6. Connexion : `https://ska-management.com/connexion` sans erreur CORS

## Dépannage CORS

| Symptôme | Solution |
|----------|----------|
| `blocked by CORS policy` | Variables CORS sur l'API + **Redeploy** |
| `403` preflight | Approuver déploiement « Needs approval » |
| Log `CORS vide` | Ajouter `APP_PLATFORM_URL` et `CORS_ORIGINS` |

Modèle : [`railway.env.example`](railway.env.example)
