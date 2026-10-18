from fastapi import APIRouter, Query, HTTPException
from soil_up.schemas.cadastre import (
    CadastralParcelCollection,
    ParcelUnionRequest,
    SiteEmpriseResult,
)
from soil_up.services.cadastre import IgnCadastreService

router = APIRouter(prefix="/api/cadastre", tags=["Cadastre"])
cadastre_service = IgnCadastreService()

@router.get("/parcels", response_model=CadastralParcelCollection)
async def get_parcels(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude en WGS84"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude en WGS84"),
):
    try:
        return await cadastre_service.get_parcels_by_coordinates(lat=lat, lon=lon)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Erreur lors de la récupération des parcelles cadastrales : {exc}"
        )

@router.post("/parcels/union", response_model=SiteEmpriseResult)
async def compute_parcels_union(payload: ParcelUnionRequest):
    try:
        return cadastre_service.union_parcels(payload.features)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul de l'emprise : {exc}")
