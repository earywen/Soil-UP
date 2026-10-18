import asyncio
from typing import Dict, Any, List
import httpx
import numpy as np
import shapely
from shapely.geometry import shape, Point
import pyproj

from soil_up.schemas.piezometrie import PiezometreItem, PiezometrieResult

HUBEAU_API_BASE = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes"

_wgs84_to_lambert93 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)

def _reproject_to_lambert93(coords: np.ndarray) -> np.ndarray:
    x, y = _wgs84_to_lambert93.transform(coords[:, 0], coords[:, 1])
    return np.column_stack([x, y])

class HubeauPiezometrieConnector:
    def __init__(self, base_url: str = HUBEAU_API_BASE, timeout: float = 8.0):
        self.base_url = base_url
        self.timeout = timeout

    async def collect(self, emprise_geojson: Dict[str, Any], buffer_meters: int = 1500) -> PiezometrieResult:
        try:
            poly_wgs84 = shape(emprise_geojson)
            poly_lambert = shapely.transform(poly_wgs84, _reproject_to_lambert93)

            # Compute bounding box with buffer
            minx, miny, maxx, maxy = poly_wgs84.bounds
            # Approximate degrees for buffer
            delta_deg = max(buffer_meters / 111000.0, 0.01)
            bbox_str = f"{minx - delta_deg},{miny - delta_deg},{maxx + delta_deg},{maxy + delta_deg}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                stations_url = f"{self.base_url}/stations"
                params = {"bbox": bbox_str, "size": 20}
                headers = {"User-Agent": "SoilUP/1.0"}
                resp = await client.get(stations_url, params=params, headers=headers)
                resp.raise_for_status()
                stations_data = resp.json().get("data", [])

                if not stations_data:
                    return PiezometrieResult(stations=[])

                # Process stations & compute distance
                items_draft = []
                for s in stations_data:
                    geom = s.get("geometry", {})
                    coords = geom.get("coordinates") if isinstance(geom, dict) else None
                    if not coords or len(coords) < 2:
                        continue
                    pt_lon, pt_lat = float(coords[0]), float(coords[1])
                    pt_lambert = shapely.transform(Point(pt_lon, pt_lat), _reproject_to_lambert93)
                    dist = round(poly_lambert.distance(pt_lambert), 1)

                    alt_station = None
                    if s.get("altitude_station"):
                        try:
                            alt_station = float(s["altitude_station"])
                        except (ValueError, TypeError):
                            pass

                    prof_inv = None
                    if s.get("profondeur_investigation"):
                        try:
                            prof_inv = float(s["profondeur_investigation"])
                        except (ValueError, TypeError):
                            pass

                    items_draft.append({
                        "code_bss": s.get("code_bss"),
                        "bss_id": s.get("bss_id"),
                        "nom_commune": s.get("nom_commune"),
                        "code_commune_insee": s.get("code_commune_insee"),
                        "altitude_station": alt_station,
                        "profondeur_investigation": prof_inv,
                        "latitude": pt_lat,
                        "longitude": pt_lon,
                        "distance_meters": dist,
                    })

                items_draft.sort(key=lambda x: x["distance_meters"])
                closest = items_draft[:5]

                # Fetch last chroniques concurrently
                tasks = [
                    self._fetch_last_chronique(client, item["code_bss"])
                    for item in closest
                ]
                chroniques_results = await asyncio.gather(*tasks, return_exceptions=True)

                final_stations: List[PiezometreItem] = []
                for item, ch_res in zip(closest, chroniques_results):
                    date_m = None
                    prof_n = None
                    cote_n = None
                    qual = None

                    if isinstance(ch_res, dict):
                        date_m = ch_res.get("date_mesure")
                        prof_n = ch_res.get("profondeur_nappe")
                        cote_n = ch_res.get("niveau_nappe_eau")
                        qual = ch_res.get("qualification")

                    final_stations.append(
                        PiezometreItem(
                            code_bss=item["code_bss"],
                            bss_id=item["bss_id"],
                            nom_commune=item["nom_commune"],
                            code_commune_insee=item["code_commune_insee"],
                            altitude_station=item["altitude_station"],
                            profondeur_investigation=item["profondeur_investigation"],
                            latitude=item["latitude"],
                            longitude=item["longitude"],
                            distance_meters=item["distance_meters"],
                            date_mesure=date_m,
                            profondeur_nappe=prof_n,
                            cote_ngf=cote_n,
                            qualification=qual,
                        )
                    )

                return PiezometrieResult(stations=final_stations)

        except Exception as exc:
            return PiezometrieResult(error=str(exc))

    async def _fetch_last_chronique(self, client: httpx.AsyncClient, code_bss: str) -> Dict[str, Any]:
        url = f"{self.base_url}/chroniques"
        params = {"code_bss": code_bss, "size": 1, "sort": "desc"}
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            return {}
        data = resp.json().get("data", [])
        return data[0] if data else {}
