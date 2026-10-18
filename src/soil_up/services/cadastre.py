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
        geom_param = json.dumps({"type": "Point", "coordinates": [lon, lat]})
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(self.base_url, params={"geom": geom_param})
            response.raise_for_status()
            data = response.json()

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
