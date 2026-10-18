from typing import List, Optional
from pydantic import BaseModel, Field

class AddressResultItem(BaseModel):
    label: str = Field(..., description="Libellé complet de l'adresse")
    name: Optional[str] = Field(None, description="Nom de la voie / numéro")
    postcode: str = Field(..., description="Code postal")
    citycode: str = Field(..., description="Code INSEE de la commune")
    city: str = Field(..., description="Nom de la commune")
    context: Optional[str] = Field(None, description="Département, région")
    latitude: float = Field(..., description="Latitude en WGS84")
    longitude: float = Field(..., description="Longitude en WGS84")
    score: float = Field(..., description="Score de pertinence BAN (0 à 1)")

class AddressSearchResponse(BaseModel):
    results: List[AddressResultItem]
