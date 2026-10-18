from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ParcelInfo(BaseModel):
    idu: str
    section: Optional[str] = None
    numero: Optional[str] = None
    contenance: Optional[int] = None

class StudyCreateRequest(BaseModel):
    name: str = Field(..., description="Nom ou référence du site d'étude")
    address: str = Field(..., description="Adresse de référence")
    emprise: Dict[str, Any] = Field(..., description="Géométrie GeoJSON de l'emprise")
    buffer_meters: int = Field(500, ge=50, le=5000, description="Rayon du buffer d'investigation en mètres")
    parcels: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Liste des parcelles cadastrales")

class StudyUpdateRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    emprise: Optional[Dict[str, Any]] = None
    buffer_meters: Optional[int] = None
    parcels: Optional[List[Dict[str, Any]]] = None

class StudyListItemResponse(BaseModel):
    id: int
    name: str
    address: str
    status: str
    buffer_meters: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudyResponse(BaseModel):
    id: int
    name: str
    address: str
    emprise: Dict[str, Any]
    buffer_meters: int
    status: str
    parcels: List[Dict[str, Any]]
    collected_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
