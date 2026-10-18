# Spécification Fonctionnelle & Technique : Jalon 2 - Géologie, Hydrogéologie, INPN & SIG Multi-couches

- **Issue GitHub** : [#8](https://github.com/earywen/Soil-UP/issues/8) (Sous-tickets : [#9](https://github.com/earywen/Soil-UP/issues/9), [#10](https://github.com/earywen/Soil-UP/issues/10), [#11](https://github.com/earywen/Soil-UP/issues/11), [#12](https://github.com/earywen/Soil-UP/issues/12), [#13](https://github.com/earywen/Soil-UP/issues/13), [#14](https://github.com/earywen/Soil-UP/issues/14))
- **Statut** : `building`
- **Date** : 2026-10-18
- **Vérifié** : En attente d'implémentation

---

## Problem Statement

Dans une étude historique et documentaire de Sites et Sols Pollués (norme NF X 31-620 Phase 1 / A100), la recherche documentaire ne se limite pas à l'historique industriel (BASIAS/BASOL/ICPE). L'ingénieur environnemental doit impérativement caractériser la vulnérabilité intrinsèque du milieu :
1. **Le contexte géologique** : nature lithologique des terrains superficiels et profonds, présence d'anciens forages ou sondages carottés avec leurs coupes géologiques déclarées (BSS - BRGM).
2. **Le contexte hydrogéologique** : profondeur de la nappe phréatique sous le sol, cotes piézométriques NGF-IGN69 et identification des aquifères vulnérables aux transferts de polluants (Hub'Eau / Ades).
3. **Le contexte topographique et altimétrique** : altitude exacte du site d'étude au format NGF et sens du relief/pente pour anticiper les écoulements de surface (IGN RGE ALTI).
4. **La sensibilité écologique et réglementaire** : proximité des espaces naturels protégés (ZNIEFF Type 1 et 2, Natura 2000 Habitats SIC/ZSC et Oiseaux ZPS - INPN/MNHN) pour qualifier la sensibilité des cibles réceptrices.
5. **La cartographie de terrain** : pouvoir basculer instantanément entre la vue cadastrale, la carte topographique OpenStreetMap et la photographie aérienne Orthophoto IGN HD haute définition pour observer le bâti et la morphologie du site.

Actuellement, l'ingénieur doit ouvrir successivement InfoTerre (BRGM), Hub'Eau, l'INPN, Géoportail et Géorisques, recopier manuellement les cotes et fiches de sondages, et calculer approximativement les distances. Cette phase est source d'erreurs et consomme un temps précieux.

---

## Solution

Soil'UP enrichit son moteur de collecte asynchrone et résiliente avec 4 nouveaux connecteurs officiels de données ouvertes et une expérience SIG multi-couches de niveau professionnel :
- **Gestionnaire cartographique multi-couches** : Bascule fluide entre les fonds de plan OpenStreetMap et Orthophoto Aérienne IGN HD, avec surcouche cadastrale transparente et affichage interactif des entités identifiées (BSS, piézomètres, ZNIEFF, ICPE, BASIAS).
- **Connecteur BRGM BSS** : Interrogation spatiale WFS des ouvrages souterrains dans le buffer d'investigation, identification des forages avec coupes lithologiques numérisées et génération des hyperliens directs vers les fiches officielles InfoTerre.
- **Connecteur Hub'Eau Piézométrie** : Détection des piézomètres officiels dans le secteur d'étude, extraction de la profondeur d'eau sous le sol (m) et calcul de la cote NGF de la nappe phréatique.
- **Connecteur IGN Altimétrie MNT** : Requête de l'API Géoplateforme RGE ALTI pour calculer l'altitude NGF moyenne, minimale et maximale de l'emprise du site ainsi que le dénivelé.
- **Connecteur INPN / PatriNat Biodiversité** : Interrogation WFS Géoplateforme des périmètres ZNIEFF I, ZNIEFF II et Natura 2000, avec calcul précis de la distance minimale à l'emprise (en mètres ou « sur site » si recoupement).
- **Enrichissement du livrable Word (.docx)** : Ajout automatique de deux nouveaux chapitres structurés dans le rapport :
  - *Chapitre 3 : Contexte Géologique, Hydrogéologique & Topographique* (altimétrie du site, synthèse piézométrique de la nappe, tableau des sondages BSS et liens coupes géologiques).
  - *Chapitre 4 : Sensibilité Écologique & Milieux Naturels* (tableau des zonages ZNIEFF et Natura 2000 avec distances métriques à l'emprise et liens vers fiches INPN).

---

## User Stories

1. **Basemap switcher** : As an ingénieur SSP, I want to basculer entre le fond de plan vectoriel OpenStreetMap et l'Orthophoto Aérienne IGN HD sur la carte interactive, so that je visualise les détails réels du terrain (bâtiments industriels, cuves, remblais) avec une précision photographique.
2. **Surcouche cadastre transparent** : As an ingénieur SSP, I want to superposer les limites parcellaires cadastrales au-dessus de l'orthophoto aérienne, so that j'identifie le périmètre cadastral exact tout en observant la réalité du terrain.
3. **Altimétrie NGF du site** : As an ingénieur SSP, I want to connaître automatiquement l'altitude NGF du site d'étude issue de l'IGN RGE ALTI, so that j'évalue immédiatement la topographie et la position altimétrique relative du site.
4. **Recensement des sondages BSS** : As an ingénieur SSP, I want to visualiser sur la carte et lister dans un tableau les forages de la Banque du Sous-Sol (BRGM) situés dans le buffer d'investigation, so that je repère les ouvrages de reconnaissance existants à proximité.
5. **Coupes géologiques BSS** : As an ingénieur SSP, I want to identifier immédiatement si un forage BSS dispose d'une coupe géologique numérisée et accéder en un clic à sa fiche officielle InfoTerre, so that je consulte sans friction la lithologie du sous-sol.
6. **Piézométrie et profondeur de nappe** : As an ingénieur SSP, I want to obtenir la profondeur moyenne de la nappe et la cote piézométrique NGF mesurée aux piézomètres les plus proches, so that je qualifie le niveau d'eau souterraine et le risque de contact sol pollué / nappe.
7. **Sensibilité écologique ZNIEFF** : As an ingénieur SSP, I want to savoir si mon site d'étude recoupe ou jouxte une ZNIEFF de type 1 ou de type 2 (avec distance en mètres), so that je mesure la sensibilité environnementale des habitats faune/flore voisins.
8. **Réseau Natura 2000** : As an ingénieur SSP, I want to identifier la distance minimale aux sites Natura 2000 (ZSC Habitats et ZPS Oiseaux), so that j'intègre les obligations réglementaires de préservation des écosystèmes.
9. **Rapport Word enrichi** : As an ingénieur SSP, I want to télécharger un rapport Word (.docx) contenant automatiquement rédigés les chapitres géologie/hydrogéologie et sensibilité écologique avec leurs tableaux de synthèse, so that mon rapport A100 soit complet sans ressaisie manuelle.
10. **Tolérance aux pannes des sources** : As an ingénieur SSP, I want to que l'indisponibilité temporaire d'un service (ex. WFS BSS ralenti ou indisponible) n'interrompe pas la collecte des autres sources et signale clairement un statut dégradé, so that mon travail n'est jamais bloqué.

---

## Implementation Decisions

### 1. Nouveaux connecteurs modulaires (conformes ADR-0005)
Chaque connecteur hérite de `BaseConnector` avec une méthode `collect(geometry: dict, buffer_meters: int) -> dict` et applique un timeout strict de 8 secondes avec `httpx.AsyncClient` :
- `IgnAltiConnector` :
  - Endpoint : `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json`
  - Calcule l'altitude du centroïde de l'emprise, ainsi que des 4 points cardinaux de la bounding box pour dégager la pente générale et le dénivelé.
- `BssConnector` :
  - Endpoint : WFS Géoservices BRGM `http://geoservices.brgm.fr/geologie`
  - Couche : `ms:BSS_TOTAL_SANS_LABEL`, format GeoJSON.
  - Filtre spatial : BBOX calculée d'après le buffer métrique projeté.
  - Attributs extraits : `reference`, `bss_id`, `nature`, `prof_atteinte`, `zsol`, `nb_scans_coupe`, `log_geol_valide`, URL InfoTerre `http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id={reference}`.
- `HubeauPiezometrieConnector` :
  - Endpoint Stations : `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations` (bbox WGS84).
  - Pour les 3 stations les plus proches : requête chroniques `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss={code}&size=1&sort=desc` pour extraire `date_mesure`, `profondeur_nappe` (m) et `niveau_nappe_eau` (m NGF).
- `InpnConnector` :
  - Endpoint : WFS Géoplateforme `https://data.geopf.fr/wfs/ows`
  - Couches interrogées : `patrinat_znieff1:znieff1`, `patrinat_znieff2:znieff2`, `patrinat_sic:sic`, `patrinat_zps:zps`.
  - Format : GeoJSON.
  - Calcul de distance métrique minimale à l'emprise en Lambert 93 via `shapely`.

### 2. Orchestration asynchrone (ADR-0002)
- Le `MultiSourceCollector` orchestre désormais les 7 connecteurs simultanément : `BanAddressConnector`, `IgnCadastreConnector`, `GeorisquesConnector`, `IgnAltiConnector`, `BssConnector`, `HubeauPiezometrieConnector`, `InpnConnector`.
- Chaque connecteur retourne un statut unitaire (`OK`, `NO_DATA`, `ERROR`, `TIMEOUT`), évitant tout échec en cascade.

### 3. Modèle de données consolidé Pydantic
Mise à jour de `StudyDataModel` et des schémas d'export :
- `altimetrie`: `{ z_mean: float, z_min: float, z_max: float, unit: "m NGF-IGN69" }`
- `bss_boreholes`: `List[{ bss_id, reference, distance_m, prof_atteinte, coupe_disponible, url_infoterre }]`
- `piezometrie`: `List[{ code_bss, nom_commune, distance_m, date_derniere_mesure, profondeur_eau_m, cote_ngf_m }]`
- `zonages_naturels`: `List[{ type_zonage, code_mnhn, nom_site, distance_m, statut_recoupement, url_inpn }]`

### 4. SIG multi-couches Frontend (Next.js / Leaflet)
- `MapContainer` enrichi avec un composant de contrôle des couches accessible et ergonomique :
  - Basemaps radio : **OpenStreetMap** (par défaut) vs **Orthophoto Aérienne IGN HD**.
  - Overlays activables/désactivables : **Cadastre parcellaire transparent**, **Buffer d'investigation**, **Forages BSS** (icônes bleues/vertes selon coupe géologique présente), **Piézomètres** (icônes goutte d'eau), **Sites BASIAS/BASOL**.
- Onglets latéraux de restitution :
  - Nouvel onglet *"Sous-sol & Nappes"* : Altimétrie MNT, piézomètres Hub'Eau, forages BSS avec tags "Coupe géologique disponible" cliquables.
  - Nouvel onglet *"Biodiversité & Nature"* : Fiches ZNIEFF 1 & 2, sites Natura 2000 avec badge de distance métrique.

### 5. Générateur Word (.docx)
Enrichissement de `DocxGeneratorService` :
- Chapitre 3 : Topographie, Géologie & Hydrogéologie.
- Chapitre 4 : Sensibilité Environnementale & Écologique.
- Remplissage automatique des tableaux correspondants et des résumés synthétiques.

---

## Testing Decisions

- **Seam de test unique validé** : L'interface HTTP des endpoints FastAPI (`TestClient` FastAPI avec `pytest`).
- **Mocks réseau hermétiques (`respx`)** : Interception de tous les appels HTTP vers `data.geopf.fr`, `geoservices.brgm.fr` et `hubeau.eaufrance.fr`.
- **Validation du document Word** : Vérification binaire avec `python-docx` de la présence des nouveaux paragraphes, des cellules de tableaux BSS, piézomètres et ZNIEFF.
- **Tests End-to-End Playwright** :
  - Test de sélection du fond de plan (passage à l'Orthophoto IGN HD).
  - Test de visibilité des nouveaux onglets "Sous-sol & Nappes" et "Biodiversité".
  - Test d'export du livrable .docx enrichi.

---

## Out of Scope

- Téléchargement et intégration des photos aériennes historiques Remonter le temps (Jalon 3).
- Rédaction automatisée par LLM de synthèses d'analyse géologique (Jalon 3).
- Gestion de comptes utilisateurs et rôles d'équipe (Jalon 3).
