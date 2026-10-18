from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, JSON, DateTime
from soil_up.database import Base

class StudyModel(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    emprise = Column(JSON, nullable=False)  # GeoJSON dict
    buffer_meters = Column(Integer, default=500, nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    parcels = Column(JSON, default=list, nullable=False)
    collected_data = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
