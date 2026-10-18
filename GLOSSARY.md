# Soil'UP - Glossaire Métier

Outil d'automatisation de diagnostic documentaire et environnemental pour les ingénieurs en Sites et Sols Pollués (SSP).

## Entités Géographiques & Métier

**Site d'étude** :
L'entité géographique faisant l'objet de la prestation environnementale ou de l'offre commerciale.
_Avoid_: Chantier, terrain, parcelle

**Emprise** :
Polygone géographique précis délimitant le contour spatial du site d'étude sur lequel sont projetées les requêtes de données.
_Avoid_: Périmètre, zone, tracé

**Buffer d'investigation** :
Rayon géographique concentrique appliqué autour de l'emprise pour rechercher les entités environnantes selon la thématique (ex. 100m, 500m, 1000m).
_Avoid_: Zone tampon, marge, périmètre élargi

**Dossier d'étude** :
Ensemble persistant regroupant l'adresse, l'emprise GeoJSON, les données brutes collectées auprès des différentes sources et les rapports générés pour un site d'étude.
_Avoid_: Projet, recherche, ticket

**Synthèse de vulnérabilité** :
Section analytique formulant une appréciation environnementale contextuelle rédigée à partir de la corrélation spatiale des sources de données.
_Avoid_: Conclusion, avis, rapport brut

**Rapport de synthèse** :
Document consolidé clé en main regroupant l'ensemble des données patrimoniales, historiques, géologiques et environnementales collectées pour le site d'étude.
_Avoid_: Dossier, audit brut, export

**Figure cartographique** :
Rendu cartographique statique haute résolution géoréférencé avec superposition de l'emprise et des entités environnantes, intégré dans le rapport Word.
_Avoid_: Capture d'écran, screenshot, plan

**Gabarit de rapport** :
Modèle de document Microsoft Word (`template.docx`) définissant la mise en page, les styles, le logo et les emplacements de substitution des données et cartes du rapport.
_Avoid_: Template brut, feuille de style

## Architecture Applicative

**Connecteur de source** :
Module applicatif autonome dédié à l'interrogation, au filtrage spatial et à la normalisation des données issues d'une API ou d'un flux externe spécifique.
_Avoid_: Scraper, plugin, fetcher

## Sources de Données & Registres

**Cadastre** :
Données parcellaires officielles (numéros de parcelles, sections, contenances) issues du plan cadastral (DGFIP / IGN).
_Avoid_: Matrice cadastrale

**BASIAS** :
Inventaire historique des activités industrielles et de services susceptibles d'avoir engendré une pollution des sols.
_Avoid_: Registre usines

**BASOL** :
Inventaire des sites pollués ou potentiellement pollués faisant l'objet d'une action des pouvoirs publics.
_Avoid_: Fichier sols pollués

**Carte géologique** :
Données lithologiques, stratigraphiques et structurales du BRGM caractérisant la nature du sous-sol du site d'étude.
_Avoid_: Carte des sols

**Photos aériennes historiques** :
Imagerie aérienne archivée issue de l'IGN (mission Remonter le temps) permettant de retracer l'évolution temporelle de l'occupation du sol.
_Avoid_: Images satellites, vues du ciel

**BSS (Banque du Sous-Sol)** :
Base de données nationale gérée par le BRGM recensant les forages, puits, piézomètres et coupes géologiques déclarées.
_Avoid_: Base forages, registre des puits

**Captage AEP** :
Point de prélèvement d'eau brute destinée à la consommation humaine et ses périmètres de protection réglementaires (immédiat, rapproché, éloigné).
_Avoid_: Prise d'eau, captage potable

**INPN** :
Inventaire National du Patrimoine Naturel recensant les zonages de protection écologique et patrimoniale (ZNIEFF, Natura 2000, réserves naturelles).
_Avoid_: Registre biodiversité
