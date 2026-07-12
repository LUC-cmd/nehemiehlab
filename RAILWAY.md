# Déploiement Railway — Smart Kids Academy

Guide pour héberger l’API et le frontend sur [Railway](https://railway.app).  
En attendant, testez d’abord en **local** (voir section en bas).

---

## Architecture recommandée

| Service Railway | Rôle |
|-----------------|------|
| **PostgreSQL** (plugin Railway) | Base de données |
| **nehemiahlab-api** | Backend Spring Boot (Dockerfile racine) |
| **nehemiahlab-web** | Frontend statique (`frontend/dist`) ou service Node build |

---

## 1. Base PostgreSQL

1. Nouveau projet Railway → **Add PostgreSQL**
2. Notez les variables générées : `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

Mappez-les vers le backend :

| Variable backend | Variable Railway Postgres |
|------------------|---------------------------|
| `DB_HOST` | `PGHOST` |
| `DB_PORT` | `PGPORT` |
| `DB_NAME` | `PGDATABASE` |
| `DB_USER` | `PGUSER` |
| `DB_PASSWORD` | `PGPASSWORD` |

---

## 2. API backend (Docker)

1. **New Service** → dépôt GitHub `nehemiahlab`
2. **Dockerfile** à la racine du repo
3. Variables d’environnement :

```env
SPRING_PROFILES_ACTIVE=demo
JWT_SECRET=(générez 64+ caractères aléatoires)
CORS_ORIGINS=https://VOTRE-FRONTEND.up.railway.app

DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=hiwendjanounai78@gmail.com
MAIL_PASSWORD=(mot de passe application Gmail — 16 caractères, sans espaces)
MAIL_FROM=hiwendjanounai78@gmail.com
MAIL_OTP_FROM=hiwendjanounai78@gmail.com

APP_SEED_ENABLED=true
APP_SEED_DIRECTOR_PASSWORD=password123
APP_SEED_DEMO_PASSWORD=password123
```

4. **Port** : Railway injecte `PORT` — vérifiez que le Dockerfile expose `8080` (déjà le cas).

> **Important :** sans `MAIL_USERNAME` / `MAIL_PASSWORD`, les inscrits **ne reçoivent aucun email**.

---

## 3. Frontend

**Option A — Static site sur Railway**

1. Service avec `root directory` = `frontend`
2. Build : `npm ci && npm run build`
3. Start / publish : `dist`
4. Variable :

```env
VITE_API_URL=https://VOTRE-API.up.railway.app/api
```

**Option B — Build local puis deploy**

Build avec `VITE_API_URL` pointant vers l’API Railway, puis déployez `frontend/dist`.

---

## 4. CORS

Une fois l’URL du frontend connue, mettez à jour `CORS_ORIGINS` sur l’API avec l’URL HTTPS exacte, puis redéployez.

---

## Test en local (maintenant)

### Terminal 1 — Backend

```powershell
cd C:\projets\nehemiahlab\backend
mvn spring-boot:run
```

Vérifiez dans les logs : `SMTP configure — envoi d'emails actif`.

### Terminal 2 — Frontend

```powershell
cd C:\projets\nehemiahlab\frontend
npm run dev
```

Ouvrez : http://localhost:5173

### Tests email

| Test | Action | Résultat attendu |
|------|--------|------------------|
| **Inscription** | `/inscription-formateur` avec `hiwe.ndjanounai2323@gmail.com` | Bandeau vert « Email envoyé » + mail reçu |
| **OTP** | Connexion → Mot de passe oublié → même email | Code à 6 chiffres reçu |
| **Validation** | Directeur valide le formateur | Email « compte validé » reçu |

Vérifiez toujours le dossier **Spam**.

### Fichier local `backend/.env`

Déjà configuré avec `hiwendjanounai78@gmail.com` (envoi Smart Kids Academy).

---

## Git ≠ secrets

- **GitHub** : code uniquement
- **Railway → Variables** : mots de passe MAIL, DB, JWT
- **`backend/.env`** : uniquement sur votre PC (gitignoré)

---

## Checklist avant mise en ligne Railway

- [ ] PostgreSQL Railway connecté à l’API
- [ ] 6 variables `MAIL_*` renseignées
- [ ] `CORS_ORIGINS` = URL frontend Railway
- [ ] `VITE_API_URL` = URL API Railway + `/api`
- [ ] Test inscription → email reçu en production
