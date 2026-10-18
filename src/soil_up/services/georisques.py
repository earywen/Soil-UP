import asyncio
from typing import Dict, Any, List
import httpx
import numpy as np
import shapely
from shapely.geometry import shape, Point
import pyproj

from soil_up.schemas.georisques import (
    CasiasItem,
    IcpeItem,
    GeorisquesCollectionResult,
)

GEORISQUES_API_BASE = "https://www.georisques.gouv.fr/api/v1"

_wgs84_to_lambert93 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)

def _reproject_to_lambert93(coords: np.ndarray) -> np.ndarray:
    x, y = _wgs84_to_lambert93.transform(coords[:, 0], coords[:, 1])
    return np.column_stack([x, y])

class GeorisquesConnector:
    def __init__(self, base_url: str = GEORISQUES_API_BASE, timeout: float = 12.0):
        self.base_url = base_url
        self.timeout = timeout

    async def collect(self, emprise_geojson: Dict[str, Any], buffer_meters: int) -> GeorisquesCollectionResult:
        emprise_shape_wgs84 = shape(emprise_geojson)
        emprise_shape_lambert = shapely.transform(emprise_shape_wgs84, _reproject_to_lambert93)

        center_lon = emprise_shape_wgs84.centroid.x
        center_lat = emprise_shape_wgs84.centroid.y

        result = GeorisquesCollectionResult()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            casias_task = self._fetch_casias(client, center_lon, center_lat, buffer_meters, emprise_shape_lambert)
            icpe_task = self._fetch_icpe(client, center_lon, center_lat, buffer_meters, emprise_shape_lambert)
            
            casias_res, icpe_res = await asyncio.gather(casias_task, icpe_task, return_exceptions=True)

            if isinstance(casias_res, Exception):
                result.errors["casias"] = str(casias_res)
            else:
                result.casias = casias_res

            if isinstance(icpe_res, Exception):
                result.errors["icpe"] = str(icpe_res)
            else:
                result.icpe = icpe_res

        return result

    async def _fetch_casias(
        self,
        client: httpx.AsyncClient,
        lon: float,
        lat: float,
        radius: int,
        emprise_lambert: shapely.Geometry
    ) -> List[CasiasItem]:
        url = f"{self.base_url}/ssp/casias"
        params = {"latlon": f"{lon},{lat}", "rayon": radius}
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        items: List[CasiasItem] = []
        for d in data.get("data", []):
            identifiant = d.get("identifiant_casias") or d.get("identifiant_ssp") or "Inconnu"
            geom = d.get("geom", {})
            coords = geom.get("coordinates") if isinstance(geom, dict) else None
            
            pt_lon = coords[0] if coords and len(coords) > 0 else lon
            pt_lat = coords[1] if coords and len(coords) > 1 else lat

            # Calculate metric distance to emprise in Lambert 93
            pt_lambert = shapely.transform(Point(pt_lon, pt_lat), _reproject_to_lambert93)
            dist = round(emprise_lambert.distance(pt_lambert), 1)

            items.append(
                CasiasItem(
                    identifiant=identifiant,
                    nom_etablissement=d.get("nom_etablissement") or "Site non nommé",
                    activite_principale=d.get("activite_principale"),
                    adresse=d.get("adresse"),
                    nom_commune=d.get("nom_commune"),
                    statut=d.get("statut"),
                    fiche_risque=d.get("fiche_risque"),
                    latitude=pt_lat,
                    longitude=pt_lon,
                    distance_meters=dist,
                )
            )

        items.sort(key=lambda x: x.distance_meters)
        return items

    async def _fetch_icpe(
        self,
        client: httpx.AsyncClient,
        lon: float,
        lat: float,
        radius: int,
        emprise_lambert: shapely.Geometry
    ) -> List[IcpeItem]:
        url = f"{self.base_url}/installations_classees"
        params = {"latlon": f"{lon},{lat}", "rayon": radius}
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        items: List[IcpeItem] = []
        for d in data.get("data", []):
            pt_lon = float(d.get("longitude", lon) or lon)
            pt_lat = float(d.get("latitude", lat) or lat)

            pt_lambert = shapely.transform(Point(pt_lon, pt_lat), _reproject_to_lambert93)
            dist = round(emprise_lambert.distance(pt_lambert), 1)

            items.append(
                IcpeItem(
                    code_aiot=d.get("codeAIOT") or "Inconnu",
                    raison_sociale=d.get("raisonSociale") or "Exploitant inconnu",
                    commune=d.get("commune"),
                    code_postal=d.get("codePostal"),
                    etat_activite=d.get("etatActivite"),
                    latitude=pt_lat,
                    longitude=pt_lon,
                    distance_meters=dist,
                )
            )

        items.sort(key=lambda x: x.distance_meters)
        return items
