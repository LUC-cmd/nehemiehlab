# Comptes de démonstration — Smart Kids Academy

Mot de passe **personnel** pour tous les comptes staff : `password123`  
Mot de passe **parents** (pré-activés en local/démo) : `password123`

API JSON (local/démo) : `GET /api/site/demo-comptes`

---

## Connexion personnel (onglet **Personnel**)

| Rôle | Email | Accès |
|------|-------|--------|
| **Directeur** | `director@nehemiahlab.com` | Toute la plateforme |
| **Responsable cluster** | `resp1@ska.tg` … `resp10@ska.tg` | Tous les centres du cluster (voir tableau ci-dessous) |
| **Coordinateur** | `coord1@ska.tg` … `coord50@ska.tg` | **1 centre** chacun |
| **Formateur** | `form1@ska.tg` … `form20@ska.tg` | 1 ou plusieurs centres |

### Responsables cluster

| Email | Cluster |
|-------|---------|
| `resp1@ska.tg` | Cluster Lomé Est |
| `resp2@ska.tg` | Cluster Maritime Ouest |
| `resp3@ska.tg` | Cluster Kpalimé |
| `resp4@ska.tg` | Cluster Atakpamé |
| `resp5@ska.tg` | Cluster Sokodé |
| `resp6@ska.tg` | Cluster Centrale Est |
| `resp7@ska.tg` | Cluster Kara Ville |
| `resp8@ska.tg` | Cluster Kara Nord |
| `resp9@ska.tg` | Cluster Dapaong |
| `resp10@ska.tg` | Cluster Mango |

### Exemples coordinateurs (centre SKA Lomé Bè = `coord1@ska.tg`)

| Email | Centre (exemple) |
|-------|------------------|
| `coord1@ska.tg` | SKA Lomé Bè |
| `coord2@ska.tg` | SKA Lomé Tokoin |
| … | … |
| `coord6@ska.tg` | SKA Agoè Nyivé |

---

## Comptes créés par le Directeur (pré-installés en démo)

| Rôle | Email | Dashboard |
|------|-------|-----------|
| **Comptable** | `compta@ska.tg` | Finances, transactions |
| **Staff Nehemiah** | `staff@ska.tg` | Ressources, communauté |
| **Animateur CEDJ** | `animateur@ska.tg` | Communauté CEDJ |
| **Bénévole** | `benevole@ska.tg` | Communauté CEDJ |
| **Participant** | `participant@ska.tg` | Communauté CEDJ |

---

## Parents (onglet **Espace parent**)

Connexion avec le **matricule de l'enfant** (pas l'email).

| Matricule | Mot de passe | Enfant (centre SKA Lomé Bè) |
|-----------|--------------|-----------------------------|
| `26SKA0001` | `password123` | 1er élève démo |
| `26SKA0002` | `password123` | 2e élève démo |
| `26SKA0003` | `password123` | 3e élève démo |
| `26SKA0004` | `password123` | 4e élève démo |
| `26SKA0005` | `password123` | 5e élève démo |

---

## 6 comptes à tester en priorité

1. **Directeur** — `director@nehemiahlab.com` / `password123`
2. **Responsable cluster** — `resp1@ska.tg` / `password123`
3. **Coordinateur** — `coord1@ska.tg` / `password123`
4. **Formateur** — `form1@ska.tg` / `password123`
5. **Comptable** — `compta@ska.tg` / `password123`
6. **Parent** — matricule `26SKA0001` / `password123` (onglet Espace parent)

---

## Activation automatique

Au démarrage (profils `local` et `demo`) :

- Tous les comptes `@ska.tg` staff : mot de passe resynchronisé, compte actif
- Responsables cluster : rôle + cluster assigné
- Comptes « créés par le Directeur » : créés s'ils manquent
- 5 parents : matricules fixes + comptes activés

Données Togo (50 centres, 500 élèves) : `APP_SEED_ENABLED=true` au premier déploiement.
