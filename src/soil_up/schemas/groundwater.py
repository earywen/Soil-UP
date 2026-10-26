from typing import Optional, List
from pydantic import BaseModel, Field

class GroundwaterSupportPoint(BaseModel):
    source: str = Field(..., description="Origine de la mesure : BSS (forage géotechnique) ou HUB_EAU (piézomètre ADES)")
    identifiant: str = Field(..., description="Référence BSS ou code ADES")
    nom: Optional[str] = Field(None, description="Nom local ou commune")
    distance_meters: float = Field(..., description="Distance à l'emprise du site en mètres")
    prof_eau_sol: Optional[float] = Field(None, description="Profondeur de l'eau mesurée en m par rapport au sol")
    cote_eau_ngf: Optional[float] = Field(None, description="Cote piézométrique absolue en m NGF")
    date_mesure: Optional[str] = Field(None, description="Date du relevé")
    altitude_sol_ouvrage: Optional[float] = Field(None, description="Altitude du terrain au niveau de l'ouvrage en m NGF")

class GroundwaterLevelEstimation(BaseModel):
    profondeur_estimee_m: Optional[float] = Field(None, description="Profondeur médiane estimée de la nappe au droit du site (m/sol)")
    profondeur_min_m: Optional[float] = Field(None, description="Niveau de nappe le plus haut / plus proche de la surface (m/sol)")
    profondeur_max_m: Optional[float] = Field(None, description="Niveau de nappe le plus bas (m/sol)")
    cote_nappe_estimee_ngf: Optional[float] = Field(None, description="Cote piézométrique médiane estimée de la nappe (m NGF)")
    altitude_site_ngf: Optional[float] = Field(None, description="Altitude moyenne du terrain naturel au site (m NGF)")
    indice_confiance: str = Field("Non déterminé", description="Fiabilité de l'estimation : Élevé, Moyen, Faible, Non déterminé")
    methode_calcul: str = Field("", description="Détail méthodologique du croisement altimétrique et piézométrique")
    nb_points_appui: int = Field(0, description="Nombre total d'ouvrages avec eau exploités")
    points_appui: List[GroundwaterSupportPoint] = Field(default_factory=list, description="Ouvrages de référence classés par proximité")
