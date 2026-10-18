from typing import Optional, List
from pydantic import BaseModel, Field

class ZonageNaturelItem(BaseModel):
    id_mnhn: str
    nom_site: str
    type_zonage: str # ZNIEFF 1, ZNIEFF 2, Natura 2000 (Habitats), Natura 2000 (Oiseaux)
    distance_meters: float
    statut_recoupement: str # "Recoupement direct" ou "Proximité (<X m)"
    url_fiche: str

class InpnResult(BaseModel):
    zonages: List[ZonageNaturelItem] = Field(default_factory=list)
    error: Optional[str] = None
