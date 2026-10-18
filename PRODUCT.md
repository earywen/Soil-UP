# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Leaflet / MapLibre GL, communiquant avec l'API FastAPI Python.

## Users

Ingénieurs et consultants en environnement spécialisés en Sites et Sols Pollués (SSP), chefs de projets en bureaux d'études et experts en diagnostic foncier et réhabilitation de sites industriels.

## Product Purpose

Automatiser et fiabiliser la phase préliminaire d'étude historique et documentaire (norme NF X 31-620 / prestation A100) en éliminant la collecte manuelle rébarbative sur une dizaine de portails publics. L'outil génère un rapport de synthèse consolidé clé en main au format Microsoft Word (.docx).

## Positioning

Une interface unifiée hybride "Split-Screen" mariant la fluidité d'un assistant conversationnel guidé et la rigueur d'un SIG interactif en temps réel, capable d'interroger les bases d'État (BAN, Cadastre IGN, Géorisques, BASIAS, BASOL, ICPE) et de calculer instantanément les distances métriques d'impact.

## Operating Context

Utilisé au bureau lors de la réponse aux appels d'offres ou au lancement d'une mission de diagnostic de pollution des sols. L'ingénieur doit pouvoir générer une fiche de synthèse ou un pré-rapport complet en moins de 2 minutes pour l'intégrer dans son offre client.

## Capabilities and Constraints

- Recherche et géocodage en langage naturel via la Base Adresse Nationale (BAN).
- Affichage vectoriel des parcelles cadastrales avec sélection/fusion en un clic pour générer l'emprise.
- Support du tracé libre au curseur pour les emprises foncières non calquées sur le cadastre.
- Calcul géométrique de buffers métriques concentriques en projection Lambert 93 (EPSG:2154).
- Requêtage asynchrone et résilient de Géorisques (BASIAS, BASOL, ICPE) avec notification temps réel.
- Génération d'un document Word (.docx) structuré et stylé à partir d'un gabarit personnalisable (`template.docx`).
- Persistance locale des dossiers d'études (SQLite / GeoJSON).

## Brand Commitments

Nom : **Soil'UP**.
Identité : Outil professionnel pour experts en ingénierie environnementale. Teintes organiques, sobres et élégantes (vert profond végétal, nuances de terre, gris techniques, lisibilité cartographique maximale).

## Evidence on Hand

- APIs publiques de l'État testées et intégrées : Base Adresse Nationale, API Carto IGN Cadastre, API Géorisques v1 (SSP / CASIAS et installations classées).
- Backend FastAPI opérationnel avec 16 tests automatisés au seam HTTP.
- Spécification détaillée [Issue #1](https://github.com/earywen/Soil-UP/issues/1) et 10 Architecture Decision Records ([docs/adr/](docs/adr/)).

## Product Principles

1. **Rigueur géométrique absolue** : L'emprise et les distances aux sources industrielles doivent être exactes et calculées en projection métrique officielle (Lambert 93).
2. **Expérience sans couture (Zero-to-Report)** : Du géocodage d'adresse au téléchargement du rapport Word en moins de 3 actions.
3. **Résilience et transparence** : Une indisponibilité d'un portail public externe ne doit jamais bloquer le dossier de l'ingénieur ; les statuts de collecte sont explicites.
4. **Livrable modifiable et valorisable** : Sortie directe en `.docx` pour que l'ingénieur puisse immédiatement s'approprier le contenu dans sa proposition commerciale.

## Accessibility & Inclusion

Interface claire à haut contraste, adaptée à une utilisation prolongée sur écran en bureau d'études, clavier complet pour les contrôles de navigation et retours d'état textuels sur toutes les actions cartographiques.
