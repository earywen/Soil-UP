import asyncio
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
import httpx
from shapely.geometry import shape

from soil_up.schemas.bdlisa import BdlisaEntity, BdlisaKarst, BdlisaResult

SANDRE_WMS_URL = "https://services.sandre.eaufrance.fr/geo/saq"

NATURE_MAP = {
    "5": "Aquifère (réservoir perméable d'eau souterraine)",
    "6": "Semi-perméable (formation conductrice modérée / aquitard)",
    "7": "Imperméable (éponte protectrice / aquiclude)",
}

MILIEU_MAP = {
    "1": "Poreux (sables, graviers, alluvions, grès poreux)",
    "2": "Fissuré (roches fracturées, socle, schistes)",
    "3": "Karstique (calcaires karstifiés, conduits et cavités)",
    "4": "Mixte (poreux et fissuré)",
    "5": "Karstique et fissuré",
}

ETAT_MAP = {
    "0": "Nappe libre affleurante (nappe de surface vulnérable)",
    "1": "Nappe libre sous couverture",
    "2": "Nappe captive sous couverture imperméable",
    "3": "Nappe captive ou semi-captive",
    "X": "Non applicable (formation imperméable)",
}

class BdlisaConnector:
    """
    Connecteur officiel BDLISA (Sandre / BRGM).
    Interroge le service WMS/GetFeatureInfo pour extraire la pile stratigraphique hydrogéologique,
    l'aquifère superficiel, la formation affleurante et les zones karstiques au droit d'un site (NF X 31-620).
    """

    def __init__(self, base_url: str = SANDRE_WMS_URL, timeout: float = 8.0):
        self.base_url = base_url
        self.timeout = timeout

    async def query_point(self, lat: float, lon: float) -> BdlisaResult:
        """
        Interroge BDLISA au droit d'une coordonnée WGS84 précise.
        """
        delta = 0.002
        bbox = f"{lat - delta},{lon - delta},{lat + delta},{lon + delta}"
        params = {
            "SERVICE": "WMS",
            "VERSION": "1.3.0",
            "REQUEST": "GetFeatureInfo",
            "LAYERS": "EntiteHydroGeol_FXX,ZonKarstiq_FXX",
            "QUERY_LAYERS": "EntiteHydroGeol_FXX,ZonKarstiq_FXX",
            "CRS": "EPSG:4326",
            "BBOX": bbox,
            "WIDTH": "101",
            "HEIGHT": "101",
            "I": "50",
            "J": "50",
            "INFO_FORMAT": "application/vnd.ogc.gml",
            "FEATURE_COUNT": "30",
        }
        headers = {"User-Agent": "SoilUP/1.0 (Environmental Risk Assessment)"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.base_url, params=params, headers=headers)
                resp.raise_for_status()

                root = ET.fromstring(resp.text)
                entities: List[BdlisaEntity] = []
                karst: Optional[BdlisaKarst] = None

                for elem in root.iter():
                    tag = elem.tag.split("}")[-1]
                    if tag == "EntiteHydroGeol_FXX_feature":
                        attrs = {c.tag.split("}")[-1]: c.text for c in elem if c.text and c.text.strip()}
                        code = attrs.get("CodeEH")
                        libelle = attrs.get("LibelleEH")
                        if code and libelle:
                            ordre = int(attrs.get("OrdreAbsEH")) if attrs.get("OrdreAbsEH", "").isdigit() else 999999
                            nat_code = attrs.get("NatureEH")
                            mil_code = attrs.get("MilieuEH")
                            etat_code = attrs.get("EtatEH")
                            niveau_code = int(attrs.get("NiveauEH")) if attrs.get("NiveauEH", "").isdigit() else 3

                            entity = BdlisaEntity(
                                code_eh=code,
                                libelle_eh=libelle,
                                ordre_abs=ordre,
                                niveau_eh=niveau_code,
                                nature_code=nat_code,
                                nature_libelle=NATURE_MAP.get(nat_code, "Formation indifférenciée"),
                                milieu_code=mil_code,
                                milieu_libelle=MILIEU_MAP.get(mil_code, "Non déterminé"),
                                etat_code=etat_code,
                                etat_libelle=ETAT_MAP.get(etat_code, "Non applicable"),
                                est_aquifere=nat_code == "5",
                                est_affleurant=etat_code == "0",
                            )
                            entities.append(entity)
                    elif tag == "ZonKarstiq_FXX_feature":
                        attrs = {c.tag.split("}")[-1]: c.text for c in elem if c.text and c.text.strip()}
                        if attrs.get("CodeZK"):
                            karst = BdlisaKarst(
                                code_zk=attrs.get("CodeZK"),
                                libelle_zk=attrs.get("LibelleZK", "Zone karstique répertoriée"),
                                situation="Affleurant" if attrs.get("SituatioZK") == "1" else "Sous couverture",
                            )

                if not entities:
                    return BdlisaResult(
                        aquifere_superficiel=None,
                        formation_affleurante=None,
                        formations=[],
                        karst=karst,
                        nb_formations=0,
                        source="Sandre / BRGM (BDLISA v3)",
                    )

                # Trier la pile du plus superficiel (ordre_abs plus petit) au plus profond
                entities.sort(key=lambda x: x.ordre_abs if x.ordre_abs is not None else 999999)

                formation_affleurante = entities[0] if entities else None
                # L'aquifère superficiel est le premier aquifère (nature_code == "5") rencontré depuis la surface
                aquifere_superficiel = next((e for e in entities if e.est_aquifere), None)

                return BdlisaResult(
                    aquifere_superficiel=aquifere_superficiel,
                    formation_affleurante=formation_affleurante,
                    formations=entities,
                    karst=karst,
                    nb_formations=len(entities),
                    source="Sandre / BRGM (BDLISA v3)",
                )

        except Exception as exc:
            return BdlisaResult(
                aquifere_superficiel=None,
                formation_affleurante=None,
                formations=[],
                karst=None,
                nb_formations=0,
                source="Sandre / BRGM (BDLISA v3)",
                error=f"Erreur de communication BDLISA Sandre : {exc}",
            )

    async def collect(self, emprise_geojson: Dict[str, Any], buffer_meters: int = 500) -> BdlisaResult:
        """
        Collecte hydrogéologique pour une emprise GeoJSON donnée en utilisant le barycentre de l'emprise.
        """
        try:
            poly = shape(emprise_geojson)
            centroid = poly.centroid
            return await self.query_point(lat=centroid.y, lon=centroid.x)
        except Exception as exc:
            return BdlisaResult(
                aquifere_superficiel=None,
                formation_affleurante=None,
                formations=[],
                karst=None,
                nb_formations=0,
                error=f"Impossible de calculer le centroïde de l'emprise pour BDLISA : {exc}",
            )
