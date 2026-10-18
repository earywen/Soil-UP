# Soil'UP — Diagnostic Foncier & Historique Automatisé

[![Backend Tests](https://img.shields.io/badge/pytest-16%20passed-brightgreen)](#tests)
[![Frontend E2E](https://img.shields.io/badge/playwright-E2E%20passed-brightgreen)](#tests)
[![Norme](https://img.shields.io/badge/Norme-NF%20X%2031--620%20(A100)-blue)](#contexte)
[![Design](https://img.shields.io/badge/Impeccable-Operate%20Mode-emerald)](#design)

**Soil'UP** est une plateforme professionnelle automatisée d'aide au diagnostic documentaire et historique des **Sites et Sols Pollués (SSP)**, conçue pour les ingénieurs en environnement et bureaux d'études intervenant dans le cadre de la norme **NF X 31-620** (prestation A100 / visite de site et étude historique préliminaire).

---

## Fonctionnalités

1. **Recherche en langage naturel** : Géocodage textuel instantané via l'API Base Adresse Nationale (BAN).
2. **SIG interactif & Cadastre IGN** : Affichage vectoriel des parcelles avec sélection au clic et calcul géométrique exact de l'emprise fusionnée en projection métrique officielle **Lambert 93** (`EPSG:2154`).
3. **Périmètres d'investigation métriques** : Buffers concentriques configurables (50 m, 100 m, 200 m, 500 m).
4. **Collecte asynchrone Géorisques** : Interrogation concurrente et résiliente des bases de données de l'État :
   - **CASIAS / BASIAS** (Inventaire historique des activités industrielles et activités de services).
   - **ICPE** (Installations Classées pour la Protection de l'Environnement).
   - Calcul des distances métriques exactes de chaque site à l'emprise.
5. **Génération d'un rapport Word (.docx) clé en main** : Document structuré et stylé à partir du gabarit `template.docx`, prêt pour inclusion dans l'offre commerciale ou le rapport d'étude.

---

## Architecture technique

```
Soil'UP/
├── src/soil_up/               # Backend Python (FastAPI + SQLAlchemy + Shapely + PyProj)
│   ├── routers/               # Endpoints REST (address, cadastre, studies)
│   ├── services/              # Connecteurs d'APIs publiques (BAN, IGN, Géorisques, python-docx)
│   └── models/                # Modèles de données SQLite
├── frontend/                  # Frontend Next.js 16 (App Router, React 19, TypeScript, Tailwind v4)
│   ├── src/components/        # WorkflowPanel (Split-Screen gauche) et Map (SIG Leaflet droit)
│   └── test-browser.mjs       # Suite de tests E2E automatisée avec Playwright & Chrome
├── docs/                      # Documentation d'ingénierie
│   ├── adr/                   # 10 Architecture Decision Records (ADR-0001 à ADR-0010)
│   └── specs/                 # Spécification fonctionnelle et technique (0001-mvp-jalon-1.md)
├── GLOSSARY.md                # Glossaire du domaine SSP & Ingénierie géotechnique
├── PRODUCT.md                 # Fiche produit Impeccable (Operate mode)
└── DESIGN.md                  # Système de design technique Deep Earth Green
```

---

## Démarrage rapide

### 1. Backend FastAPI (Port 8000)
```bash
# Activation de l'environnement virtuel
source .venv/bin/activate

# Lancement du serveur API
uvicorn soil_up.main:app --host 0.0.0.0 --port 8000 --reload
```
- API accessible sur `http://localhost:8000`
- Documentation interactive Swagger : `http://localhost:8000/docs`

### 2. Frontend Next.js (Port 3001)
```bash
cd frontend
npm install
npm run dev
```
- Interface accessible localement : `http://localhost:3001`
- Accessible depuis un autre PC du réseau local : `http://<IP-HOTE>:3001/` (ex: `http://192.168.1.75:3001/`)

---

## Tests et validation

### Tests Backend (Pytest)
```bash
.venv/bin/pytest
# 16 tests passés en ~1s (couverture HTTP seam complète avec respx)
```

### Tests Frontend E2E (Playwright)
```bash
cd frontend
npm run test:e2e
# Simule le parcours utilisateur complet : recherche BAN, sélection parcelle, calcul d'emprise, collecte Géorisques et téléchargement .docx
```

### Audit Design (Impeccable)
```bash
.gemini/skills/impeccable/scripts/impeccable detect frontend/src
# 0 anti-pattern détecté
```

---

## Suivi des tickets (Jalon 1 MVP - 100% Terminé)

| Ticket | Intitulé | Statut |
| :---: | :--- | :---: |
| [#1](https://github.com/earywen/Soil-UP/issues/1) | **Spec: MVP Jalon 1 - Diagnostic documentaire automatisé** | `Closed` |
| [#2](https://github.com/earywen/Soil-UP/issues/2) | Fondations du backend & Recherche d'adresse (BAN) | `Closed` |
| [#3](https://github.com/earywen/Soil-UP/issues/3) | Détection & intersection des parcelles cadastrales IGN | `Closed` |
| [#4](https://github.com/earywen/Soil-UP/issues/4) | Persistance des dossiers d'études (SQLite) | `Closed` |
| [#5](https://github.com/earywen/Soil-UP/issues/5) | Collecte asynchrone des données Géorisques (BASIAS, ICPE) | `Closed` |
| [#6](https://github.com/earywen/Soil-UP/issues/6) | Générateur de rapport Word (.docx) piloté par gabarit | `Closed` |
| [#7](https://github.com/earywen/Soil-UP/issues/7) | Frontend Split-Screen & Diagnostic SIG interactif (Leaflet) | `Closed` |
