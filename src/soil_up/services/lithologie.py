from typing import Optional, List, Dict, Any
from soil_up.schemas.altimetrie import AltimetrieResult
from soil_up.schemas.groundwater import GroundwaterLevelEstimation
from soil_up.schemas.bdlisa import BdlisaResult
from soil_up.schemas.bss import BssResult, BssBoreholeItem
from soil_up.schemas.lithologie import LithologieSynthesis, LithologieLayerItem

class LithologieService:
    """
    Service de reconstitution et de synthèse lithologique au droit du site d'étude (NF X 31-620).
    Croise la Banque du Sous-Sol (BSS BRGM), le référentiel hydrogéologique BDLISA,
    l'altimétrie LiDAR IGN et l'estimation de profondeur de la nappe pour établir
    le profil géologique vertical et inventorier les coupes de forage numérisées.
    """

    def synthesize(
        self,
        altimetrie: Optional[AltimetrieResult] = None,
        groundwater: Optional[GroundwaterLevelEstimation] = None,
        bdlisa: Optional[BdlisaResult] = None,
        bss: Optional[BssResult] = None,
    ) -> LithologieSynthesis:
        z_site = altimetrie.z_mean if altimetrie and altimetrie.z_mean is not None else None
        prof_eau = groundwater.profondeur_estimee_m if groundwater else None

        # 1. Identifier les forages BSS voisins disposant d'une coupe géologique
        boreholes_with_coupes: List[BssBoreholeItem] = []
        if bss and bss.boreholes:
            boreholes_with_coupes = [b for b in bss.boreholes if b.coupe_disponible]

        closest_coupe = boreholes_with_coupes[0] if boreholes_with_coupes else None

        # 2. Contexte géologique régional et de surface
        formation_surf = "Formations alluvionnaires et de couverture"
        if bdlisa:
            if bdlisa.formation_affleurante:
                formation_surf = bdlisa.formation_affleurante.libelle_eh
            elif bdlisa.aquifere_superficiel:
                formation_surf = bdlisa.aquifere_superficiel.libelle_eh

        region_geol = "Bassin Parisien"
        if closest_coupe and closest_coupe.lieu_dit:
            region_geol = f"{closest_coupe.nom_commune or ''} — {closest_coupe.lieu_dit}"

        # 3. Établir la stratification lithologique verticale
        layers: List[LithologieLayerItem] = []

        # Couche A : Remblais et horizon de surface anthropique (0 à 1.5 m)
        epaisseur_remblais = 1.5
        z_toit_remblais = z_site
        z_base_remblais = round(z_site - epaisseur_remblais, 2) if z_site is not None else None

        layers.append(
            LithologieLayerItem(
                profondeur_toit_m=0.0,
                profondeur_base_m=epaisseur_remblais,
                cote_ngf_toit=z_toit_remblais,
                cote_ngf_base=z_base_remblais,
                designation="Remblais anthropiques et sols superficiels",
                lithologie="Terre végétale, matériaux hétérogènes remaniés, matrice sablo-limoneuse et gravats de démolition",
                permeabilite="Semi-perméable",
                type_couche="remblais",
                est_zone_saturee=False,
            )
        )

        # Couche B : Formations superficielles / Zone non saturée (Vadose)
        base_alluvions_vadose = prof_eau if prof_eau and prof_eau > epaisseur_remblais else 6.0
        z_toit_alluvions = z_base_remblais
        z_base_alluvions = round(z_site - base_alluvions_vadose, 2) if z_site is not None else None

        nom_alluvions = "Alluvions modernes à anciennes (zone non saturée)"
        if "alluvion" in formation_surf.lower():
            nom_alluvions = formation_surf

        layers.append(
            LithologieLayerItem(
                profondeur_toit_m=epaisseur_remblais,
                profondeur_base_m=base_alluvions_vadose,
                cote_ngf_toit=z_toit_alluvions,
                cote_ngf_base=z_base_alluvions,
                designation=nom_alluvions,
                lithologie="Sables fins à moyens, lentilles de limons argileux, graviers et cailloutis de silex",
                permeabilite="Perméable",
                type_couche="alluvions",
                est_zone_saturee=False,
            )
        )

        # Couche C : Aquifère superficiel / Zone saturée de nappe
        base_aquifere = round(base_alluvions_vadose + 5.0, 1)
        # Ajustement par rapport à la profondeur médiane des sondages BSS locaux
        if closest_coupe and closest_coupe.prof_atteinte and closest_coupe.prof_atteinte > base_alluvions_vadose:
            base_aquifere = min(closest_coupe.prof_atteinte, round(base_alluvions_vadose + 8.0, 1))

        z_toit_aq = z_base_alluvions
        z_base_aq = round(z_site - base_aquifere, 2) if z_site is not None else None

        nom_aq = "Aquifère alluvial (zone saturée)"
        if bdlisa and bdlisa.aquifere_superficiel:
            nom_aq = f"Zone saturée — {bdlisa.aquifere_superficiel.libelle_eh}"

        layers.append(
            LithologieLayerItem(
                profondeur_toit_m=base_alluvions_vadose,
                profondeur_base_m=base_aquifere,
                cote_ngf_toit=z_toit_aq,
                cote_ngf_base=z_base_aq,
                designation=nom_aq,
                lithologie="Sables alluvionnaires grossiers, graviers saturés d'eau, galets de silex et matrice perméable",
                permeabilite="Très perméable",
                type_couche="aquifere",
                est_zone_saturee=True,
            )
        )

        # Couche D : Substratum géologique régional
        nom_substratum = "Substratum géologique carbonaté"
        litho_substratum = "Craie blanche à silex, calcaires marneux ou argiles de fondation du bassin sédimentaire"

        if bdlisa and len(bdlisa.formations) > 1:
            formation_profonde = bdlisa.formations[-1]
            nom_substratum = f"Substratum — {formation_profonde.libelle_eh}"
            litho_substratum = f"{formation_profonde.milieu_libelle} ({formation_profonde.nature_libelle})"

        z_toit_sub = z_base_aq

        layers.append(
            LithologieLayerItem(
                profondeur_toit_m=base_aquifere,
                profondeur_base_m=None,
                cote_ngf_toit=z_toit_sub,
                cote_ngf_base=None,
                designation=nom_substratum,
                lithologie=litho_substratum,
                permeabilite="Fissuré / Modéré",
                type_couche="substratum",
                est_zone_saturee=True,
            )
        )

        # 4. Description textuelle synthétique
        nb_coupes = len(boreholes_with_coupes)
        ref_text = ""
        if closest_coupe:
            ref_text = (
                f" Le sondage BSS de référence le plus proche ({closest_coupe.reference}, situé à {round(closest_coupe.distance_meters)} m) "
                f"a atteint une profondeur de {closest_coupe.prof_atteinte} m"
                f"{f' avec un niveau d’eau relevé à {closest_coupe.prof_eau_sol} m/sol' if closest_coupe.prof_eau_sol else ''}."
            )

        synth_desc = (
            f"Au droit du site (cote terrain naturel {z_site or 'n.d.'} m NGF), le sous-sol se caractérise par "
            f"une couverture superficielle de remblais anthropiques (~0 à {epaisseur_remblais} m), "
            f"reposant sur une formation alluvionnaire perméable à dominante sablo-graveleuse. "
            f"La nappe phréatique est interceptée à environ {prof_eau or '10'} m de profondeur, "
            f"au sein de l'aquifère superficiel, avant d'atteindre le substratum régional.{ref_text}"
        )

        forage_ref_dict = None
        if closest_coupe:
            forage_ref_dict = closest_coupe.model_dump()

        return LithologieSynthesis(
            formation_surface=formation_surf,
            contexte_regional=region_geol,
            layers=layers,
            nb_forages_coupes=nb_coupes,
            forage_reference=forage_ref_dict,
            description_synthese=synth_desc,
        )
