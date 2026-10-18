from typing import Optional, List
from pydantic import BaseModel, Field

class AltimetriePoint(BaseModel):
    lon: float
    lat: float
    z: float
    acc: Optional[str] = None

class AltimetrieResult(BaseModel):
    z_mean: Optional[float] = None
    z_min: Optional[float] = None
    z_max: Optional[float] = None
    denivele: Optional[float] = None
    unit: str = "m NGF-IGN69"
    points: List[AltimetriePoint] = Field(default_factory=list)
    error: Optional[str] = None
