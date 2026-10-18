from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CasiasItem(BaseModel):
    identifiant: str = Field(..., description="Identifiant CASIAS ou SSP")
    nom_etablissement: str = Field(..., description="Raison sociale ou nom du site")
    activite_principale: Optional[str] = Field(None, description="Activité industrielle historique")
    adresse: Optional[str] = None
    nom_commune: Optional[str] = None
    statut: Optional[str] = Field(None, description="Statut de l'activité (ex: En arrêt, En activité)")
    fiche_risque: Optional[str] = Field(None, description="URL de la fiche risque détaillée")
    latitude: float
    longitude: float
    distance_meters: float = Field(..., description="Distance métrique minimale à l'emprise du site")

class IcpeItem(BaseModel):
    code_aiot: str = Field(..., description="Identifiant AIOT de l'installation classée")
    raison_sociale: str = Field(..., description="Nom de l'exploitant")
    commune: Optional[str] = None
    code_postal: Optional[str] = None
    etat_activite: Optional[str] = None
    latitude: float
    longitude: float
    distance_meters: float = Field(..., description="Distance métrique minimale à l'emprise du site")

class GeorisquesCollectionResult(BaseModel):
    casias: List[CasiasItem] = Field(default_factory=list)
    icpe: List[IcpeItem] = Field(default_factory=list)
    errors: Dict[str, str] = Field(default_factory=dict)
