from typing import Optional, List
from pydantic import BaseModel, Field

class BdlisaEntity(BaseModel):
    code_eh: str = Field(..., description="Code officiel BDLISA de l'entité hydrogéologique")
    libelle_eh: str = Field(..., description="Nom complet / lithologie de l'entité")
    ordre_abs: Optional[int] = Field(None, description="Ordre absolu dans la pile géologique (plus petit = plus superficiel)")
    niveau_eh: Optional[int] = Field(None, description="Niveau de découpage BDLISA (ex: 3 pour local)")
    nature_code: Optional[str] = Field(None, description="Code Sandre de la nature géologique")
    nature_libelle: str = Field("Non déterminé", description="Aquifère, Semi-perméable ou Imperméable")
    milieu_code: Optional[str] = Field(None, description="Code Sandre du type de milieu")
    milieu_libelle: str = Field("Non déterminé", description="Poreux, Fissuré, Karstique, Mixte...")
    etat_code: Optional[str] = Field(None, description="Code Sandre de l'état de la nappe")
    etat_libelle: str = Field("Non déterminé", description="Nappe libre affleurante, captive, semi-captive...")
    est_aquifere: bool = Field(False, description="Vrai s'il s'agit d'un réservoir d'eau (NatureEH=5)")
    est_affleurant: bool = Field(False, description="Vrai si affleurant en surface")

class BdlisaKarst(BaseModel):
    code_zk: str = Field(..., description="Code zone karstique")
    libelle_zk: str = Field(..., description="Description de la formation karstifiée")
    situation: str = Field("Sous couverture", description="Affleurant ou Sous couverture")

class BdlisaResult(BaseModel):
    aquifere_superficiel: Optional[BdlisaEntity] = Field(None, description="Aquifère principal de surface / nappe phréatique au droit du site")
    formation_affleurante: Optional[BdlisaEntity] = Field(None, description="Formation géologique exacte affleurant en surface")
    formations: List[BdlisaEntity] = Field(default_factory=list, description="Pile stratigraphique hydrogéologique complète au droit du point")
    karst: Optional[BdlisaKarst] = Field(None, description="Présence éventuelle de formation karstique")
    nb_formations: int = Field(0, description="Nombre total d'entités répertoriées sous le site")
    source: str = Field("Sandre / BRGM (BDLISA v3)", description="Source officielle des données hydrogéologiques")
    error: Optional[str] = Field(None, description="Message d'erreur éventuel lors de la collecte")
