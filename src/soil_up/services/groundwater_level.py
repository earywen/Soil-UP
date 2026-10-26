import statistics
from typing import Optional, List, Dict, Any

from soil_up.schemas.altimetrie import AltimetrieResult
from soil_up.schemas.piezometrie import PiezometrieResult
from soil_up.schemas.bss import BssResult
from soil_up.schemas.groundwater import GroundwaterLevelEstimation, GroundwaterSupportPoint

class GroundwaterLevelService:
    """
    Service d'estimation hydrogéologique de la profondeur et du niveau de la nappe phréatique
    au droit du site d'étude (NF X 31-620).
    Croise l'Altimétrie RGE ALTI / LiDAR (IGN Géoplateforme), la Piézométrie (Hub'Eau ADES)
    et les sondages de reconnaissance de la Banque du Sous-Sol (BSS BRGM).
    """

    def estimate(
        self,
        altimetrie: Optional[AltimetrieResult] = None,
        piezometrie: Optional[PiezometrieResult] = None,
        bss: Optional[BssResult] = None,
    ) -> GroundwaterLevelEstimation:
        z_site = altimetrie.z_mean if altimetrie and altimetrie.z_mean is not None else None

        points_appui: List[GroundwaterSupportPoint] = []
        depth_candidates: List[float] = []
        piezo_cotes: List[float] = []

        # 1. Traitement des piézomètres Hub'Eau (ADES)
        if piezometrie and piezometrie.stations:
            for pz in piezometrie.stations:
                cote_eau = pz.cote_ngf
                prof_eau = pz.profondeur_nappe
                alt_sol = pz.altitude_station

                # Si on a la cote NGF de l'eau mais pas la prof, et qu'on a l'alt sol
                if prof_eau is None and cote_eau is not None and alt_sol is not None:
                    prof_eau = round(alt_sol - cote_eau, 2)
                # Si on a la prof mais pas la cote NGF, et qu'on a l'alt sol
                if cote_eau is None and prof_eau is not None and alt_sol is not None:
                    cote_eau = round(alt_sol - prof_eau, 2)

                if prof_eau is not None or cote_eau is not None:
                    pt = GroundwaterSupportPoint(
                        source="HUB_EAU",
                        identifiant=pz.code_bss,
                        nom=pz.nom_commune,
                        distance_meters=round(pz.distance_meters, 1),
                        prof_eau_sol=prof_eau,
                        cote_eau_ngf=cote_eau,
                        date_mesure=pz.date_mesure,
                        altitude_sol_ouvrage=alt_sol,
                    )
                    points_appui.append(pt)

                    # Estimation de profondeur au site si cote eau et z_site connus
                    if cote_eau is not None and z_site is not None:
                        proj_depth = round(z_site - cote_eau, 1)
                        if proj_depth > 0:
                            depth_candidates.append(proj_depth)
                            piezo_cotes.append(cote_eau)
                    elif prof_eau is not None:
                        depth_candidates.append(prof_eau)

        # 2. Traitement des sondages BSS avec prof_eau_sol
        if bss and bss.boreholes:
            for b in bss.boreholes:
                prof_eau = b.prof_eau_sol
                if prof_eau is None:
                    continue

                cote_eau = b.cote_eau_calculee
                alt_sol = b.zsol

                pt = GroundwaterSupportPoint(
                    source="BSS",
                    identifiant=b.reference,
                    nom=b.nom_commune,
                    distance_meters=round(b.distance_meters, 1),
                    prof_eau_sol=prof_eau,
                    cote_eau_ngf=cote_eau,
                    date_mesure=b.date_eau_sol,
                    altitude_sol_ouvrage=alt_sol,
                )
                points_appui.append(pt)

                # Si on a la cote altimétrique de l'eau dans le forage et l'altitude du site
                if cote_eau is not None and z_site is not None:
                    proj_depth = round(z_site - cote_eau, 1)
                    if proj_depth > 0:
                        depth_candidates.append(proj_depth)
                        piezo_cotes.append(cote_eau)
                    else:
                        depth_candidates.append(prof_eau)
                else:
                    depth_candidates.append(prof_eau)

        # Tri des points d'appui par distance croissante au site
        points_appui.sort(key=lambda p: p.distance_meters)

        if not depth_candidates:
            return GroundwaterLevelEstimation(
                altitude_site_ngf=z_site,
                indice_confiance="Non déterminé",
                methode_calcul="Aucun forage BSS avec niveau d'eau ni piézomètre avec chronique disponible dans le périmètre.",
                nb_points_appui=0,
                points_appui=[],
            )

        # Filtrage des valeurs aberrantes ou extrêmes (> 150m pour une nappe de sub-surface)
        valid_depths = [d for d in depth_candidates if 0.1 <= d <= 120.0]
        if not valid_depths:
            valid_depths = depth_candidates

        # Calcul des métriques statistiques
        prof_estimee = round(statistics.median(valid_depths), 1)
        prof_min = round(min(valid_depths), 1)
        prof_max = round(max(valid_depths), 1)

        cote_estimee = None
        if z_site is not None:
            cote_estimee = round(z_site - prof_estimee, 2)
        elif piezo_cotes:
            cote_estimee = round(statistics.median(piezo_cotes), 2)

        # Évaluation de l'indice de confiance
        closest_dist = points_appui[0].distance_meters if points_appui else 9999
        nb_pts = len(points_appui)
        dispersion = prof_max - prof_min

        if closest_dist <= 300 and (nb_pts >= 2 or dispersion <= 2.5):
            confiance = "Élevé"
        elif closest_dist <= 1000 or nb_pts >= 3:
            confiance = "Moyen"
        else:
            confiance = "Faible"

        # Synthèse textuelle de la méthode
        nb_bss = sum(1 for p in points_appui if p.source == "BSS")
        nb_piezo = sum(1 for p in points_appui if p.source == "HUB_EAU")
        sources_desc = []
        if nb_bss > 0:
            sources_desc.append(f"{nb_bss} sondage(s) BSS avec niveau d'eau")
        if nb_piezo > 0:
            sources_desc.append(f"{nb_piezo} piézomètre(s) Hub'Eau / ADES")

        sources_str = " et ".join(sources_desc)
        alti_str = f"avec l'altitude LiDAR du site (Z={z_site} m NGF)" if z_site is not None else "sur relevés géotechniques locaux"

        methode = (
            f"Estimation statistique médiane ({prof_estimee} m) croisée {alti_str} "
            f"à partir de {sources_str} (ouvrage le plus proche à {closest_dist} m)."
        )

        return GroundwaterLevelEstimation(
            profondeur_estimee_m=prof_estimee,
            profondeur_min_m=prof_min,
            profondeur_max_m=prof_max,
            cote_nappe_estimee_ngf=cote_estimee,
            altitude_site_ngf=z_site,
            indice_confiance=confiance,
            methode_calcul=methode,
            nb_points_appui=len(points_appui),
            points_appui=points_appui[:10],
        )
