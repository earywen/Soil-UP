from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CadastralParcelProperties(BaseModel):
    idu: str = Field(..., description="Identifiant unique de la parcelle")
    section: str = Field(..., description="Section cadastrale")
    numero: str = Field(..., description="Numéro de la parcelle")
    nom_com: Optional[str] = Field(None, description="Nom de la commune")
    code_insee: Optional[str] = Field(None, description="Code INSEE de la commune")
    contenance: Optional[int] = Field(None, description="Contenance cadastrale en m²")

class CadastralParcelFeature(BaseModel):
    type: str = "Feature"
    id: Optional[str] = None
    geometry: Dict[str, Any]
    properties: CadastralParcelProperties

class CadastralParcelCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[CadastralParcelFeature]

class ParcelUnionRequest(BaseModel):
    features: List[CadastralParcelFeature] = Field(..., description="Liste des parcelles à fusionner")

class SiteEmpriseResult(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any] = Field(..., description="Géométrie de l'emprise fusionnée en GeoJSON")
    properties: Dict[str, Any] = Field(..., description="Métadonnées de l'emprise (surface, liste des IDU)")
