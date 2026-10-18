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
Rayon géographique concentrique appliqué autour de l'emprise pour rechercher les entités environnantes selon la thématique (ex. 100m, 500m, 1000m, 1500m).
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

## Géologie & Hydrogéologie (Sous-sol)

**BSS (Banque du Sous-Sol)** :
Inventaire national officiel du BRGM regroupant les ouvrages souterrains déclarés (forages, sondages carottés, puits d'eau, piézomètres) avec leur identifiant officiel et leur profondeur atteinte.
_Avoid_: Base des forages, registre des trous

**Log géologique (Coupe lithologique)** :
Relevé descriptif vertical des couches de terrains géologiques et remblais anthropiques traversés par un forage, documenté dans la fiche officielle du BRGM.
_Avoid_: Schéma de sol, profil de terre

**Piézomètre** :
Ouvrage foré équipé pour mesurer la profondeur de la surface libre d'une nappe d'eau souterraine (aquifère).
_Avoid_: Puits quelconque, trou d'eau

**Cote piézométrique** :
Altitude NGF (système altimétrique officiel français NGF-IGN69) de la nappe phréatique calculée par différence entre l'altitude du repère de mesure et la profondeur d'eau mesurée sous le sol.
_Avoid_: Hauteur d'eau brute

**MNT (Modèle Numérique de Terrain)** :
Données topographiques officielles d'altimétrie (IGN RGE ALTI) permettant de déterminer l'altitude exacte du site d'étude et le sens de la pente du relief.
_Avoid_: Relief Google, carte d'altitude

## Milieux Naturels & Biodiversité

**ZNIEFF (Zone Naturelle d'Intérêt Écologique, Faunistique et Floristique)** :
Inventaire naturaliste scientifique piloté par le MNHN / INPN identifiant les secteurs de grand intérêt biologique (Type I) et les grands ensembles naturels riches et peu modifiés (Type II).
_Avoid_: Réserve naturelle générique

**Natura 2000** :
Réseau écologique européen de sites naturels protégés comprenant les Zones Spéciales de Conservation (ZSC, directive Habitats) et les Zones de Protection Spéciale (ZPS, directive Oiseaux).
_Avoid_: Parc régional, zone verte

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

**ICPE** :
Installations Classées pour la Protection de l'Environnement (usines, entrepôts, carrières, élevages) soumises à déclaration, enregistrement ou autorisation préfectorale.
