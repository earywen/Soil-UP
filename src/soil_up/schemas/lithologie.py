from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class LithologieLayerItem(BaseModel):
    profondeur_toit_m: float = Field(0.0, description="Toit de la couche en m sous le sol")
    profondeur_base_m: Optional[float] = Field(None, description="Base de la couche en m sous le sol")
    cote_ngf_toit: Optional[float] = Field(None, description="Cote NGF du sommet de la couche")
    cote_ngf_base: Optional[float] = Field(None, description="Cote NGF de la base de la couche")
    designation: str = Field(..., description="Désignation lithologique synthétique")
    lithologie: str = Field(..., description="Description sédimentaire / lithologique détaillée")
    permeabilite: str = Field("Perméable", description="Perméable, Semi-perméable, Imperméable")
    type_couche: str = Field("formation", description="Type de tranche : remblais | alluvions | aquifere | substratum")
    est_zone_saturee: bool = Field(False, description="Indique si la nappe phréatique se situe dans cette couche")

class LithologieSynthesis(BaseModel):
    formation_surface: str = Field("Formations superficielles", description="Formation géologique affleurante cartographiée")
    contexte_regional: str = Field("", description="Bassin sédimentaire / région géologique")
    layers: List[LithologieLayerItem] = Field(default_factory=list, description="Profil lithologique synthétique vertical reconstitué")
    nb_forages_coupes: int = Field(0, description="Nombre total de forages BSS avec coupe géologique numérisée dans le secteur")
    forage_reference: Optional[Dict[str, Any]] = Field(None, description="Sondage de reconnaissance le plus proche disposant d'un log")
    description_synthese: str = Field("", description="Synthèse géologique et lithologique (NF X 31-620)")
