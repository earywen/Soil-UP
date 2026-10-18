# Spécification Fonctionnelle & Technique : MVP Jalon 1

- **Issue GitHub** : [#1](https://github.com/earywen/Soil-UP/issues/1)
- **Statut** : `done`
- **Date** : 2026-10-18
- **Vérifié** : 2026-10-18 (16/16 tests backend pytest validés, suite Playwright E2E passée en vert, rapport Word .docx opérationnel)

---

## Problem Statement

Les ingénieurs en Sites et Sols Pollués (SSP) doivent collecter manuellement des données dispersées sur de multiples portails publics (Cadastre, Géorisques, BASIAS, BASOL, ICPE) pour chaque offre commerciale ou rapport d'étude historique préliminaire (Phase 1 / A100). Cette collecte répétitive prend plusieurs heures par dossier, entraîne des risques d'oublis ou d'erreurs de saisie, et nécessite ensuite de reformater manuellement les données sous forme de tableaux et de chapitres dans des documents bureautiques.

## Solution

Soil'UP fournit une plateforme automatisée où l'ingénieur saisit simplement l'adresse d'un site d'étude, sélectionne ou trace l'emprise exacte sur un fond cadastral interactif, et déclenche une collecte asynchrone et résiliente auprès des APIs officielles de l'État (Base Adresse Nationale, WFS Cadastre de l'IGN, API Géorisques). Le système génère automatiquement un rapport de synthèse "clés en main" au format Microsoft Word (.docx) prêt à l'emploi, contenant les informations cadastrales, la liste et le statut des installations historiques BASIAS et des sites BASOL identifiés dans le buffer d'investigation, ainsi que des tableaux de synthèse éditables.

## User Stories

1. As an ingénieur SSP, I want to rechercher une adresse en langage naturel via l'API Adresse nationale (BAN), so that je localise instantanément le secteur géographique de mon site d'étude.
2. As an ingénieur SSP, I want to visualiser les parcelles cadastrales superposées à l'adresse recherchée, so that j'identifie visuellement l'assiette foncière du site d'étude.
3. As an ingénieur SSP, I want to sélectionner une ou plusieurs parcelles cadastrales par simple clic, so that le système calcule et fusionne automatiquement la géométrie de l'emprise globale du site.
4. As an ingénieur SSP, I want to dessiner manuellement un polygone libre pour l'emprise, so that je définis précisément le périmètre lorsque le site ne correspond pas exactement aux limites parcellaires officielles.
5. As an ingénieur SSP, I want to configurer la distance du buffer d'investigation autour de l'emprise (ex. 100 m, 500 m, 1 000 m), so that j'adapte le périmètre de recherche selon la sensibilité du contexte environnemental et hydrogéologique.
6. As an ingénieur SSP, I want to lancer la collecte automatique multi-sources en un clic, so that je délègue l'interrogation manuelle fastidieuse des différents portails publics.
7. As an ingénieur SSP, I want to suivre en temps réel la progression de l'interrogation de chaque connecteur de source, so that je sais exactement quelles données sont déjà collectées et quelles requêtes sont en cours.
8. As an ingénieur SSP, I want to que la collecte continue même si une API externe est temporairement lente ou indisponible, so that un échec partiel ne bloque pas l'ensemble de mon dossier d'étude.
9. As an ingénieur SSP, I want to récupérer la liste exhaustive des parcelles recoupées par l'emprise (numéro de parcelle, section, commune, surface calculée), so that j'intègre les références foncières exactes dans mon dossier.
10. As an ingénieur SSP, I want to identifier tous les sites et activités industrielles historiques BASIAS situés dans le buffer d'investigation, so that j'évalue les sources potentielles de pollution historique des sols.
11. As an ingénieur SSP, I want to obtenir pour chaque fiche BASIAS son identifiant, sa raison sociale, son activité principale, sa date d'exploitation et sa distance minimale à l'emprise, so that je dispose immédiatement des éléments clés d'analyse sans chercher la fiche manuellement.
12. As an ingénieur SSP, I want to identifier les sites BASOL et installations classées (ICPE) sous surveillance dans le buffer, so that je relève d'éventuels contentieux ou arrêtés préfectoraux connus de l'administration.
13. As an ingénieur SSP, I want to télécharger un rapport de synthèse au format Microsoft Word (.docx), so that je peux directement intégrer, modifier et personnaliser les textes et tableaux dans mon livrable client.
14. As an ingénieur SSP, I want to que le rapport Word généré respecte une structure documentaire standardisée (Page de garde, Informations générales, Cadastre, Contexte BASIAS/BASOL/ICPE, Tableau de synthèse), so that le document soit immédiatement exploitable sans reformatage lourd.
15. As an ingénieur SSP, I want to que le rapport Word soit produit à partir d'un gabarit de rapport personnalisable (template.docx), so that je puisse à terme injecter la charte graphique et le logo de mon bureau d'études.
16. As an ingénieur SSP, I want to que chaque dossier d'étude soit sauvegardé avec son adresse, son emprise GeoJSON et l'horodatage des données collectées, so that je puisse le recharger ultérieurement et conserver une traçabilité rigoureuse de mes recherches documentaires.
17. As an ingénieur SSP, I want to consulter la liste de mes dossiers d'études récents, so that je reprends facilement un travail en cours sans tout ressaisir.
18. As an ingénieur SSP, I want to recevoir des messages d'erreur explicites et constructifs si une adresse est introuvable ou si aucune parcelle n'est détectée, so that je corrige rapidement mes paramètres de recherche.

## Implementation Decisions

- **Architecture globale** : Découpage clair Backend API / Services / Connecteurs conformément à l'ADR-0004 (FastAPI) et l'ADR-0005 (Connecteurs modulaires).
- **Interface BaseConnector** : Définition d'un contrat standardisé pour tous les connecteurs : chaque connecteur implémente une méthode asynchrone prenant en paramètre une géométrie d'emprise (GeoJSON Polygon/MultiPolygon) et un buffer d'investigation (en mètres), et retourne une structure typée Pydantic.
- **Connecteurs initiaux du Jalon 1** :
  - `BanAddressConnector` : géocodage textuel via l'API Adresse ouverte (`adresse.data.gouv.fr/search`).
  - `IgnCadastreConnector` : interrogation spatiale du cadastre via le service WFS / GeoJSON de la Géoplateforme IGN pour extraire les parcelles sous l'emprise.
  - `GeorisquesConnector` : interrogation des endpoints publics Géorisques pour BASIAS, BASOL et ICPE avec filtrage spatial par distance à l'emprise.
- **Moteur d'orchestration asynchrone** : Conforme à l'ADR-0002, orchestration concurrente via `asyncio.gather` avec gestion d'exceptions individuelles par source (`return_exceptions=True`) garantissant la résilience face aux pannes réseau ou aux indisponibilités des APIs de l'État.
- **Gestion spatiale et géométrique** : Utilisation de `shapely` et `pyproj` côté backend pour les calculs géométriques (buffer métrique en projection Lambert 93 EPSG:2154, union de parcelles, re-projection WGS84 EPSG:4326 pour GeoJSON).
- **Générateur Word piloté par gabarit** : Conforme à l'ADR-0003 et ADR-0006, module de rendu basé sur `python-docx` / `docxtpl` substituant les variables et générant les tableaux dynamiques de synthèse dans un document `template.docx`.
- **Modèle de persistance** : Conforme à l'ADR-0007, base SQLite gérée via SQLAlchemy (ou SQLModel) stockant les entités `StudyRecord` (ID, nom, adresse, emprise GeoJSON, buffer, statut, données collectées au format JSON, chemin du rapport généré, dates de création et mise à jour).
- **Contrats d'APIs REST** :
  - `GET /api/address/search?q={query}` : Autocomplétion et géocodage d'adresse.
  - `GET /api/cadastre/parcels?lat={lat}&lon={lon}` ou `POST /api/cadastre/parcels/intersect` : Récupération des polygones parcellaires.
  - `POST /api/studies/` : Création d'un dossier d'étude avec adresse et emprise GeoJSON.
  - `POST /api/studies/{id}/collect` : Déclenchement de la collecte multi-sources (asynchrone avec retour de statut ou streaming SSE).
  - `GET /api/studies/{id}` : Consultation de l'état d'avancement et des données consolidées d'une étude.
  - `GET /api/studies/{id}/export/docx` : Téléchargement du fichier `.docx` généré.

## Testing Decisions

- **Philosophie de test** : Tester exclusivement le comportement observable externe et les contrats d'API, sans se lier aux détails internes de classes ou de structures privées.
- **Seam de test unique validé** : L'interface HTTP des routes FastAPI (`TestClient` FastAPI avec `pytest`).
  - Les requêtes HTTP clientes adressées aux endpoints de l'API constituent l'unique point d'entrée de test.
  - Les réponses HTTP (codes statuts, corps JSON, en-têtes et fichier binaire Word) constituent l'unique point de vérification.
  - Les appels réseau externes vers l'API BAN, l'IGN et Géorisques sont interceptés et simulés au niveau de la couche transport réseau (via `respx` ou `httpx.MockTransport`) avec des fixtures de réponses JSON représentatives du monde réel.
  - La validation du fichier `.docx` généré s'effectue en ouvrant le flux binaire avec `docx.Document` et en vérifiant la présence effective des sections clés, des tableaux et des données injectées.

## Out of Scope

- Téléchargement, tuilage et re-projection d'orthophotos historiques issues de Remonter le temps (Jalon 2).
- Interrogation de la Banque du Sous-Sol (BSS) et de la carte géologique BRGM (Jalon 2).
- Interrogation de l'INPN pour la biodiversité et les zonages réglementaires (Jalon 2).
- Rédaction de pré-synthèses analytiques via un LLM tiers (Jalon 2).
- Authentification multi-utilisateurs et gestion de comptes abonnés.
- Déploiement en cluster Kubernetes / Cloud managé.

## Further Notes

- Les termes utilisés dans cette spécification respectent scrupuleusement les définitions du glossaire métier `GLOSSARY.md`.
- Les 10 décisions d'architecture (ADR-0001 à ADR-0010) ont été prises en compte dans les arbitrages techniques.
- Cette spécification sert de contrat de référence pour le découpage en tickets d'implémentation (`/to-tickets`).
