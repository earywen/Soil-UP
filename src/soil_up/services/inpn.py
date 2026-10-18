import asyncio
from typing import Dict, Any, List, Tuple
import httpx
import numpy as np
import shapely
from shapely.geometry import shape
import pyproj

from soil_up.schemas.inpn import ZonageNaturelItem, InpnResult

GEOPF_WFS_BASE = "https://data.geopf.fr/wfs/ows"

_wgs84_to_lambert93 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)
_epsg3857_to_lambert93 = pyproj.Transformer.from_crs("EPSG:3857", "EPSG:2154", always_xy=True)

def _reproject_to_lambert93(coords: np.ndarray) -> np.ndarray:
    x, y = _wgs84_to_lambert93.transform(coords[:, 0], coords[:, 1])
    return np.column_stack([x, y])

def _reproject_3857_to_lambert93(coords: np.ndarray) -> np.ndarray:
    x, y = _epsg3857_to_lambert93.transform(coords[:, 0], coords[:, 1])
    return np.column_stack([x, y])

LAYERS_CONFIG = [
    ("patrinat_znieff1:znieff1", "ZNIEFF de type I"),
    ("patrinat_znieff2:znieff2", "ZNIEFF de type II"),
    ("patrinat_sic:sic", "Natura 2000 (ZSC Habitats)"),
    ("patrinat_zps:zps", "Natura 2000 (ZPS Oiseaux)"),
]

class InpnConnector:
    def __init__(self, base_url: str = GEOPF_WFS_BASE, timeout: float = 8.0):
        self.base_url = base_url
        self.timeout = timeout

    async def collect(self, emprise_geojson: Dict[str, Any], buffer_meters: int = 2000) -> InpnResult:
        try:
            poly_wgs84 = shape(emprise_geojson)
            poly_lambert = shapely.transform(poly_wgs84, _reproject_to_lambert93)

            minx, miny, maxx, maxy = poly_wgs84.bounds
            delta_deg = max(buffer_meters / 111000.0, 0.015)
            # Format OGC 2.0.0 EPSG:4326 is minlat,minlon,maxlat,maxlon
            bbox_str = f"{miny - delta_deg},{minx - delta_deg},{maxy + delta_deg},{maxx + delta_deg},urn:ogc:def:crs:EPSG::4326"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                tasks = [
                    self._fetch_layer(client, layer_name, label, bbox_str, poly_lambert)
                    for layer_name, label in LAYERS_CONFIG
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)

            all_zonages: List[ZonageNaturelItem] = []
            errors: List[str] = []
            for r in results:
                if isinstance(r, Exception):
                    errors.append(str(r))
                elif isinstance(r, list):
                    all_zonages.extend(r)

            # Sort by distance
            all_zonages.sort(key=lambda x: x.distance_meters)
            err_msg = "; ".join(errors) if errors and not all_zonages else None
            return InpnResult(zonages=all_zonages, error=err_msg)

        except Exception as exc:
            return InpnResult(error=str(exc))

    async def _fetch_layer(
        self,
        client: httpx.AsyncClient,
        layer_name: str,
        label: str,
        bbox_str: str,
        poly_lambert: shapely.Geometry
    ) -> List[ZonageNaturelItem]:
        params = {
            "SERVICE": "WFS",
            "VERSION": "2.0.0",
            "REQUEST": "GetFeature",
            "TYPENAME": layer_name,
            "OUTPUTFORMAT": "application/json",
            "BBOX": bbox_str,
            "COUNT": "20",
        }
        headers = {"User-Agent": "SoilUP/1.0"}

        resp = await client.get(self.base_url, params=params, headers=headers)
        if resp.status_code != 200:
            return []
        data = resp.json()

        crs_name = ""
        crs_dict = data.get("crs", {})
        if isinstance(crs_dict, dict):
            props = crs_dict.get("properties", {})
            crs_name = props.get("name", "")

        is_3857 = "3857" in crs_name or "EPSG::3857" in crs_name

        items: List[ZonageNaturelItem] = []
        for feat in data.get("features", []):
            props = feat.get("properties", {})
            geom_raw = feat.get("geometry")
            if not geom_raw:
                continue

            try:
                geom_obj = shape(geom_raw)
                if is_3857:
                    geom_lambert = shapely.transform(geom_obj, _reproject_3857_to_lambert93)
                else:
                    geom_lambert = shapely.transform(geom_obj, _reproject_to_lambert93)

                if poly_lambert.intersects(geom_lambert):
                    dist = 0.0
                    statut = "Recoupement direct (Sur site)"
                else:
                    dist = round(poly_lambert.distance(geom_lambert), 1)
                    statut = f"À {dist} m"

                id_mnhn = str(props.get("id_mnhn") or props.get("id_local") or props.get("cd_sig") or "Inconnu")
                nom_site = props.get("nom_site") or "Site naturel sans nom"
                url_f = props.get("url_fiche")
                if not url_f:
                    if "znieff" in layer_name:
                        url_f = f"https://inpn.mnhn.fr/zone/znieff/{id_mnhn}"
                    else:
                        url_f = f"https://inpn.mnhn.fr/site/natura2000/{id_mnhn}"

                items.append(
                    ZonageNaturelItem(
                        id_mnhn=id_mnhn,
                        nom_site=nom_site,
                        type_zonage=label,
                        distance_meters=dist,
                        statut_recoupement=statut,
                        url_fiche=url_f,
                    )
                )
            except Exception:
                continue

        return items
