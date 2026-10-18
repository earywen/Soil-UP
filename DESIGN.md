# Design System — Soil'UP

<!-- impeccable:design-schema 1 -->

## World & Atmosphere

- **Archetype / Metaphor**: Bureau d'ingénierie environnementale de précision (NF X 31-620, diagnostic des sites et sols pollués). Rigueur cartographique, données géotechniques fiables, clarté documentaire absolue.
- **Surface Mode**: `Operate` (l'ingénieur accomplit une mission technique critique, la lisibilité et l'ergonomie priment sur les fioritures décoratives).
- **Light / Dark Policy**: Thème clair technique prioritaire (usage diurne en bureau d'études et sur chantier).

## Color System

- **Brand Primary (Deep Earth Green)**:
  - `primary-900`: `#143323` (En-têtes, contrastes forts)
  - `primary-800`: `#1b4332` (Actions principales, emprise validée)
  - `primary-700`: `#2d6a4f` (Survols, accents)
  - `primary-100`: `#d8f3dc` (Badges de confirmation, remplissage emprise)
- **Neutral Grounds (Technical Slate)**:
  - `slate-50`: `#f8fafc` (Fond d'application)
  - `slate-100`: `#f1f5f9` (Piliers et panneaux secondaires)
  - `slate-200`: `#e2e8f0` (Bordures et séparateurs structurels)
  - `slate-700`: `#334155` (Texte secondaire, légendes)
  - `slate-900`: `#0f172a` (Texte principal, labels d'en-tête)
- **Domain Accents (Risques & Inventaires Publics)**:
  - `casias-amber`: `#d97706` (Sites CASIAS / BASIAS)
  - `icpe-crimson`: `#b91c1c` (Installations classées ICPE)
  - `cadastre-gold`: `#f59e0b` (Parcelles cadastrales sélectionnables)

## Typography

- **Font Family**: Système de précision (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) avec support des chiffres tabulaires (`tabular-nums` pour les surfaces en m² et distances en m).
- **Scale**:
  - App Header: `text-lg font-bold tracking-tight`
  - Section Headers: `text-sm font-semibold tracking-wide uppercase text-slate-700`
  - Body Text: `text-sm leading-relaxed text-slate-800`
  - Metadata & Metrics: `text-xs font-mono tabular-nums text-slate-600`

## Spatial Composition (Split-Screen)

- **Left Panel (38% to 42% width, min 420px, max 520px)**:
  - Workflow conversationnel guidé, défilement indépendant, contrôles séquentiels.
  - 4 étapes claires : 1. Adresse BAN → 2. Sélection Cadastrale IGN → 3. Collecte Géorisques → 4. Rapport Word.
- **Right Panel (Flex-1, 100% height)**:
  - Carte SIG haute performance Leaflet.
  - Tuiles vectorielles/raster lisibles, couches superposées avec bascule visuelle.
  - Popups contextuelles riches affichant les identifiants officiels et les distances réelles en projection Lambert 93.

## Motion & Tactility

- Transitions douces de 150ms sur les clics et survols d'états.
- Indicateurs de chargement discrets (pulse technique sur les boutons de collecte asynchrone).
- Synchronisation bidirectionnelle : le survol d'une entité dans la liste latérale illumine l'élément sur la carte et réciproquement.
