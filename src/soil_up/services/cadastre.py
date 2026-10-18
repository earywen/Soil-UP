import json
from typing import List, Dict, Any
import httpx
import numpy as np
import shapely
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
import pyproj

from soil_up.schemas.cadastre import (
    CadastralParcelCollection,
    CadastralParcelFeature,
    SiteEmpriseResult,
)

IGN_APICARTO_CADASTRE_URL = "https://apicarto.ign.fr/api/cadastre/parcelle"

# Transformer for metric area calculations (WGS84 EPSG:4326 -> Lambert 93 EPSG:2154)
_wgs84_to_lambert93 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)

def _reproject_to_lambert93(coords: np.ndarray) -> np.ndarray:
    x, y = _wgs84_to_lambert93.transform(coords[:, 0], coords[:, 1])
    return np.column_stack([x, y])

class IgnCadastreService:
    def __init__(self, base_url: str = IGN_APICARTO_CADASTRE_URL, timeout: float = 10.0):
        self.base_url = base_url
        self.timeout = timeout

    async def get_parcels_by_coordinates(self, lat: float, lon: float) -> CadastralParcelCollection:
        geom_point = json.dumps({"type": "Point", "coordinates": [lon, lat]})
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(self.base_url, params={"geom": geom_point})
            response.raise_for_status()
            data = response.json()

            # Fallback: if the coordinate falls onto the public road (0 parcels returned),
            # query with a 30m proximity box to retrieve the adjacent parcel candidates.
            if not data.get("features"):
                delta = 0.00035
                geom_box = {
                    "type": "Polygon",
                    "coordinates": [[
                        [lon - delta, lat - delta],
                        [lon + delta, lat - delta],
                        [lon + delta, lat + delta],
                        [lon - delta, lat + delta],
                        [lon - delta, lat - delta],
                    ]]
                }
                fallback_res = await client.get(self.base_url, params={"geom": json.dumps(geom_box)})
                if fallback_res.is_success:
                    data = fallback_res.json()

        features: List[CadastralParcelFeature] = []
        for feat in data.get("features", []):
            features.append(CadastralParcelFeature.model_validate(feat))

        return CadastralParcelCollection(features=features)

    def union_parcels(self, features: List[CadastralParcelFeature]) -> SiteEmpriseResult:
        if not features:
            raise ValueError("Au moins une parcelle est requise pour calculer l'emprise.")

        shapes = []
        idu_list = []
        contenance_totale_cadastrale = 0

        for f in features:
            s = shape(f.geometry)
            shapes.append(s)
            idu_list.append(f.properties.idu)
            if f.properties.contenance:
                contenance_totale_cadastrale += f.properties.contenance

        # Geometric union of all parcel geometries
        merged_shape = unary_union(shapes)
        
        # Calculate metric surface in Lambert 93 using modern shapely.transform
        lambert_shape = shapely.transform(merged_shape, _reproject_to_lambert93)
        calculated_area_m2 = round(lambert_shape.area, 2)

        return SiteEmpriseResult(
            geometry=mapping(merged_shape),
            properties={
                "parcel_ids": idu_list,
                "parcels_count": len(features),
                "contenance_cadastrale_totale": contenance_totale_cadastrale,
                "calculated_area_m2": calculated_area_m2,
            }
        )

    def compute_custom_emprise(self, geometry: Dict[str, Any]) -> SiteEmpriseResult:
        if not geometry or not isinstance(geometry, dict):
            raise ValueError("Géométrie d'emprise invalide.")

        geom_type = geometry.get("type")
        if geom_type not in ("Polygon", "MultiPolygon"):
            raise ValueError("L'emprise libre doit être un polygone GeoJSON (Polygon ou MultiPolygon).")

        coords = geometry.get("coordinates")
        if not coords or len(coords) == 0:
            raise ValueError("Coordonnées de polygone absentes.")

        # Ensure at least 4 coordinates for a closed linear ring (3 points + closure)
        if geom_type == "Polygon" and (not coords[0] or len(coords[0]) < 4):
            raise ValueError("Un polygone doit comporter au moins 3 sommets distincts et être fermé.")

        try:
            poly_shape = shape(geometry)
            if not poly_shape.is_valid:
                poly_shape = poly_shape.buffer(0)
            
            lambert_shape = shapely.transform(poly_shape, _reproject_to_lambert93)
            area_m2 = round(lambert_shape.area, 2)

            if area_m2 <= 0:
                raise ValueError("La surface calculée de l'emprise doit être strictement positive.")

            return SiteEmpriseResult(
                geometry=geometry,
                properties={
                    "calculated_area_m2": area_m2,
                    "custom_drawing": True,
                    "parcels_count": 0,
                    "parcel_ids": [],
                }
            )
        except Exception as exc:
            if isinstance(exc, ValueError):
                raise
            raise ValueError(f"Erreur de géométrie du polygone : {exc}")
