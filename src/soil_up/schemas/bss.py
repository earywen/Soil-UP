from typing import Optional, List
from pydantic import BaseModel, Field

class BssBoreholeItem(BaseModel):
    reference: str
    bss_id: Optional[str] = None
    nom_commune: Optional[str] = None
    lieu_dit: Optional[str] = None
    nature: Optional[str] = None
    prof_atteinte: Optional[float] = None
    zsol: Optional[float] = None
    prof_eau_sol: Optional[float] = None
    date_eau_sol: Optional[str] = None
    cote_eau_calculee: Optional[float] = None
    coupe_disponible: bool = False
    nb_scans_coupe: int = 0
    auteur_coupe: Optional[str] = None
    date_coupe: Optional[str] = None
    mode_execution: Optional[str] = None
    documents: Optional[str] = None
    url_infoterre: str
    latitude: float
    longitude: float
    distance_meters: float

class BssResult(BaseModel):
    boreholes: List[BssBoreholeItem] = Field(default_factory=list)
    error: Optional[str] = None
