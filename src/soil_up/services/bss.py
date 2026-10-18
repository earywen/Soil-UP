from typing import Dict, Any, List
import httpx
import numpy as np
import shapely
from shapely.geometry import shape, Point
import pyproj

from soil_up.schemas.bss import BssBoreholeItem, BssResult

BRGM_WFS_BASE = "http://geoservices.brgm.fr/geologie"

_wgs84_to_lambert93 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)

def _reproject_to_lambert93(coords: np.ndarray) -> np.ndarray:
    x, y = _wgs84_to_lambert93.transform(coords[:, 0], coords[:, 1])
    return np.column_stack([x, y])

class BssConnector:
    def __init__(self, base_url: str = BRGM_WFS_BASE, timeout: float = 8.0):
        self.base_url = base_url
        self.timeout = timeout

    async def collect(self, emprise_geojson: Dict[str, Any], buffer_meters: int = 1000) -> BssResult:
        try:
            poly_wgs84 = shape(emprise_geojson)
            poly_lambert = shapely.transform(poly_wgs84, _reproject_to_lambert93)

            minx, miny, maxx, maxy = poly_wgs84.bounds
            delta_deg = max(buffer_meters / 111000.0, 0.005)
            # BRGM WFS CRS84 BBOX is lon_min,lat_min,lon_max,lat_max
            bbox_str = f"{minx - delta_deg},{miny - delta_deg},{maxx + delta_deg},{maxy + delta_deg},urn:ogc:def:crs:OGC:1.3:CRS84"

            params = {
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeName": "ms:BSS_TOTAL_SANS_LABEL",
                "outputFormat": "application/json; subtype=geojson; charset=utf-8",
                "bbox": bbox_str,
                "count": "100",
            }
            headers = {"User-Agent": "SoilUP/1.0"}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.base_url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()

            features = data.get("features", [])
            boreholes: List[BssBoreholeItem] = []

            for f in features:
                props = f.get("properties", {})
                geom = f.get("geometry", {})
                coords = geom.get("coordinates") if isinstance(geom, dict) else None
                if not coords or len(coords) < 2:
                    continue

                pt_lon, pt_lat = float(coords[0]), float(coords[1])
                pt_lambert = shapely.transform(Point(pt_lon, pt_lat), _reproject_to_lambert93)
                dist = round(poly_lambert.distance(pt_lambert), 1)

                ref = props.get("reference") or props.get("indice") or "Inconnu"

                # Parse depths and altitudes
                prof = None
                if props.get("prof_atteinte"):
                    try:
                        prof = float(props["prof_atteinte"])
                    except (ValueError, TypeError):
                        pass

                zsol = None
                if props.get("zsol"):
                    try:
                        zsol = float(props["zsol"])
                    except (ValueError, TypeError):
                        pass

                nb_scans = 0
                if props.get("nb_scans_coupe"):
                    try:
                        nb_scans = int(props["nb_scans_coupe"])
                    except (ValueError, TypeError):
                        pass

                has_log = (
                    nb_scans > 0
                    or props.get("log_geol_valide") == "Present"
                    or "COUPE-GEOLOGIQUE" in str(props.get("documents", "")).upper()
                    or props.get("coupe_geologique") not in (None, "", "Absente")
                )

                url_info = f"http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id={ref}"

                boreholes.append(
                    BssBoreholeItem(
                        reference=ref,
                        bss_id=props.get("bss_id"),
                        nom_commune=props.get("nom_commune"),
                        nature=props.get("nature") or "FORAGE",
                        prof_atteinte=prof,
                        zsol=zsol,
                        coupe_disponible=has_log,
                        nb_scans_coupe=nb_scans,
                        url_infoterre=url_info,
                        latitude=pt_lat,
                        longitude=pt_lon,
                        distance_meters=dist,
                    )
                )

            boreholes.sort(key=lambda x: x.distance_meters)
            return BssResult(boreholes=boreholes[:25])

        except Exception as exc:
            return BssResult(error=str(exc))
