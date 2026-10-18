from fastapi import APIRouter, Query, HTTPException
from soil_up.schemas.address import AddressSearchResponse
from soil_up.services.ban import BanAddressService

router = APIRouter(prefix="/api/address", tags=["Address"])
ban_service = BanAddressService()

@router.get("/search", response_model=AddressSearchResponse)
async def search_address(
    q: str = Query(..., min_length=1, description="Terme de recherche d'adresse"),
    limit: int = Query(5, ge=1, le=20, description="Nombre maximum de résultats")
):
    try:
        results = await ban_service.search(query=q, limit=limit)
        return AddressSearchResponse(results=results)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erreur de communication avec l'API BAN : {exc}")
