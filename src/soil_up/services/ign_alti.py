from typing import Dict, Any, List
import httpx
from shapely.geometry import shape

from soil_up.schemas.altimetrie import AltimetrieResult, AltimetriePoint

IGN_ALTI_API_BASE = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest"

class IgnAltiConnector:
    def __init__(self, base_url: str = IGN_ALTI_API_BASE, timeout: float = 8.0):
        self.base_url = base_url
        self.timeout = timeout

    async def collect(self, emprise_geojson: Dict[str, Any], buffer_meters: int = 0) -> AltimetrieResult:
        try:
            poly = shape(emprise_geojson)
            centroid = poly.centroid
            minx, miny, maxx, maxy = poly.bounds

            sample_points = [
                (round(centroid.x, 6), round(centroid.y, 6)),
                (round(minx, 6), round(miny, 6)),
                (round(maxx, 6), round(maxy, 6)),
                (round(minx, 6), round(maxy, 6)),
                (round(maxx, 6), round(miny, 6)),
            ]

            # Unique points
            unique_points = list(dict.fromkeys(sample_points))
            lons = "|".join(str(p[0]) for p in unique_points)
            lats = "|".join(str(p[1]) for p in unique_points)

            url = f"{self.base_url}/elevation.json"
            params = {
                "lon": lons,
                "lat": lats,
                "resource": "ign_rge_alti_wld",
                "zonly": "false",
            }
            headers = {"User-Agent": "SoilUP/1.0 (contact@soilup.fr)"}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()

            elevations = data.get("elevations", [])
            points: List[AltimetriePoint] = []
            z_values: List[float] = []

            for item in elevations:
                z = item.get("z")
                if z is not None:
                    try:
                        zf = float(z)
                        z_values.append(zf)
                        points.append(
                            AltimetriePoint(
                                lon=item.get("lon"),
                                lat=item.get("lat"),
                                z=zf,
                                acc=item.get("acc"),
                            )
                        )
                    except (ValueError, TypeError):
                        pass

            if not z_values:
                return AltimetrieResult(error="Aucune valeur d'altitude retournée par l'API IGN.")

            z_mean = round(sum(z_values) / len(z_values), 1)
            z_min = round(min(z_values), 1)
            z_max = round(max(z_values), 1)
            denivele = round(z_max - z_min, 1)

            return AltimetrieResult(
                z_mean=z_mean,
                z_min=z_min,
                z_max=z_max,
                denivele=denivele,
                points=points,
            )

        except Exception as exc:
            return AltimetrieResult(error=str(exc))
