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

## 1. Base PostgreSQL (obligatoire — sans ça l’API crash)

### Méthode recommandée (1 clic)

1. Projet Railway → **+ New** → **Database** → **PostgreSQL**
2. Attendez que le service PostgreSQL soit **Active**
3. Cliquez sur **nehemiahlab-api** → onglet **Variables**
4. **+ New Variable** → **Add Reference** (ou **Connect** selon l’interface)
5. Sélectionnez le service **PostgreSQL** → cochez **PGHOST**, **PGPORT**, **PGDATABASE**, **PGUSER**, **PGPASSWORD**
6. Railway injecte ces variables automatiquement — **pas besoin de `DB_*`**

> L’erreur `UnknownHostException: ${DB_HOST}` signifie que PostgreSQL n’existe pas ou que `DB_HOST` a été saisi en texte brut (`${{Postgres.PGHOST}}`) au lieu d’une **référence Railway**.

### Méthode manuelle (si besoin)

| Variable sur l’API | Référence Railway |
|--------------------|-------------------|
| `DB_HOST` | `${{NomDuServicePostgres.PGHOST}}` |
| `DB_PORT` | `${{NomDuServicePostgres.PGPORT}}` |
| `DB_NAME` | `${{NomDuServicePostgres.PGDATABASE}}` |
| `DB_USER` | `${{NomDuServicePostgres.PGUSER}}` |
| `DB_PASSWORD` | `${{NomDuServicePostgres.PGPASSWORD}}` |

Remplacez `NomDuServicePostgres` par le nom exact du service (souvent `Postgres`).

**Supprimez** toute variable `DB_HOST` dont la valeur est littéralement `${DB_HOST}` ou `${{...}}` non résolu.

---

## 2. API backend (Docker)

1. **New Service** → dépôt GitHub `nehemiahlab`
2. **Dockerfile** à la racine du repo
3. Variables d’environnement :

```env
SPRING_PROFILES_ACTIVE=demo
JWT_SECRET=(générez 64+ caractères aléatoires)
CORS_ORIGINS=https://VOTRE-FRONTEND.up.railway.app

# PostgreSQL : connectez la base via "Add Reference" (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)
# OU mappez manuellement DB_* — voir section 1

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

## 3. Frontend (`nehemiahlab-web`)

1. Service avec **Root Directory** = `frontend`
2. Le dépôt contient `nixpacks.toml` : build + `npm run start` (sert le dossier `dist`)
3. Variables **obligatoires** :

```env
VITE_API_URL=https://VOTRE-API.up.railway.app/api
```

> Sans `VITE_API_URL`, le site s’affiche mais l’API ne répond pas.  
> Si le service **Crashed** : vérifiez les logs — souvent il manquait `start` (corrigé dans le repo).

**Build Command** (si Railway demande manuellement) : `npm ci && npm run build`  
**Start Command** : `npm run start`

---

## 3 bis. PostgreSQL (souvent oublié)

Sur votre capture, il manque la base **PostgreSQL**. Sans elle, l’API échoue au démarrage.

1. Projet Railway → **+ New** → **Database** → **PostgreSQL**
2. Liez les variables `DB_*` sur `nehemiahlab-api` (voir section 1)

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
