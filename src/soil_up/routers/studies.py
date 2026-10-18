from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from soil_up.database import get_db
from soil_up.models.study import StudyModel
from soil_up.schemas.study import (
    StudyCreateRequest,
    StudyUpdateRequest,
    StudyResponse,
    StudyListItemResponse,
)

router = APIRouter(prefix="/api/studies", tags=["Studies"])

@router.post("/", response_model=StudyResponse, status_code=status.HTTP_201_CREATED)
def create_study(payload: StudyCreateRequest, db: Session = Depends(get_db)):
    record = StudyModel(
        name=payload.name,
        address=payload.address,
        emprise=payload.emprise,
        buffer_meters=payload.buffer_meters,
        status="draft",
        parcels=payload.parcels or [],
        collected_data={},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/", response_model=List[StudyListItemResponse])
def list_studies(db: Session = Depends(get_db)):
    studies = db.query(StudyModel).order_by(StudyModel.created_at.desc()).all()
    return studies

@router.get("/{study_id}", response_model=StudyResponse)
def get_study(study_id: int, db: Session = Depends(get_db)):
    record = db.query(StudyModel).filter(StudyModel.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dossier d'étude introuvable.")
    return record

@router.put("/{study_id}", response_model=StudyResponse)
def update_study(study_id: int, payload: StudyUpdateRequest, db: Session = Depends(get_db)):
    record = db.query(StudyModel).filter(StudyModel.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dossier d'étude introuvable.")

    if payload.name is not None:
        record.name = payload.name
    if payload.address is not None:
        record.address = payload.address
    if payload.emprise is not None:
        record.emprise = payload.emprise
    if payload.buffer_meters is not None:
        record.buffer_meters = payload.buffer_meters
    if payload.parcels is not None:
        record.parcels = payload.parcels

    db.commit()
    db.refresh(record)
    return record
