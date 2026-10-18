from typing import Optional, List
from pydantic import BaseModel, Field

class PiezometreItem(BaseModel):
    code_bss: str
    bss_id: Optional[str] = None
    nom_commune: Optional[str] = None
    code_commune_insee: Optional[str] = None
    altitude_station: Optional[float] = None
    profondeur_investigation: Optional[float] = None
    latitude: float
    longitude: float
    distance_meters: float
    date_mesure: Optional[str] = None
    profondeur_nappe: Optional[float] = None
    cote_ngf: Optional[float] = None
    qualification: Optional[str] = None

class PiezometrieResult(BaseModel):
    stations: List[PiezometreItem] = Field(default_factory=list)
    error: Optional[str] = None
