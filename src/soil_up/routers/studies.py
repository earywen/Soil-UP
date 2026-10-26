import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from soil_up.database import get_db
from soil_up.models.study import StudyModel
from soil_up.schemas.study import (
    StudyCreateRequest,
    StudyUpdateRequest,
    StudyResponse,
    StudyListItemResponse,
)
from soil_up.services.georisques import GeorisquesConnector
from soil_up.services.ign_alti import IgnAltiConnector
from soil_up.services.bss import BssConnector
from soil_up.services.hubeau_piezo import HubeauPiezometrieConnector
from soil_up.services.inpn import InpnConnector
from soil_up.services.groundwater_level import GroundwaterLevelService
from soil_up.services.report import ReportGeneratorService

router = APIRouter(prefix="/api/studies", tags=["Studies"])
georisques_connector = GeorisquesConnector()
ign_alti_connector = IgnAltiConnector()
bss_connector = BssConnector()
hubeau_piezo_connector = HubeauPiezometrieConnector()
inpn_connector = InpnConnector()
groundwater_service = GroundwaterLevelService()
report_service = ReportGeneratorService()

@router.post("", response_model=StudyResponse, status_code=status.HTTP_201_CREATED)
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

@router.get("", response_model=List[StudyListItemResponse])
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

@router.post("/{study_id}/collect", response_model=StudyResponse)
async def collect_study_data(study_id: int, db: Session = Depends(get_db)):
    record = db.query(StudyModel).filter(StudyModel.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dossier d'étude introuvable.")

    record.status = "in_progress"
    db.commit()

    try:
        tasks = [
            georisques_connector.collect(record.emprise, record.buffer_meters),
            ign_alti_connector.collect(record.emprise, record.buffer_meters),
            bss_connector.collect(record.emprise, record.buffer_meters),
            hubeau_piezo_connector.collect(record.emprise, record.buffer_meters),
            inpn_connector.collect(record.emprise, record.buffer_meters),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        geo_res, alti_res, bss_res, piezo_res, inpn_res = results

        collected_data = {
            "casias": [],
            "icpe": [],
            "altimetrie": None,
            "bss": [],
            "piezometrie": [],
            "zonages_naturels": [],
            "errors": {},
        }

        # 1. Georisques
        if isinstance(geo_res, Exception):
            collected_data["errors"]["georisques"] = str(geo_res)
        elif geo_res:
            collected_data["casias"] = [item.model_dump() for item in geo_res.casias]
            collected_data["icpe"] = [item.model_dump() for item in geo_res.icpe]
            if geo_res.errors:
                collected_data["errors"].update(geo_res.errors)

        # 2. Altimétrie
        if isinstance(alti_res, Exception):
            collected_data["errors"]["altimetrie"] = str(alti_res)
        elif alti_res:
            collected_data["altimetrie"] = alti_res.model_dump()
            if alti_res.error:
                collected_data["errors"]["altimetrie"] = alti_res.error

        # 3. BSS
        if isinstance(bss_res, Exception):
            collected_data["errors"]["bss"] = str(bss_res)
        elif bss_res:
            collected_data["bss"] = [item.model_dump() for item in bss_res.boreholes]
            if bss_res.error:
                collected_data["errors"]["bss"] = bss_res.error

        # 4. Piézométrie
        if isinstance(piezo_res, Exception):
            collected_data["errors"]["piezometrie"] = str(piezo_res)
        elif piezo_res:
            collected_data["piezometrie"] = [item.model_dump() for item in piezo_res.stations]
            if piezo_res.error:
                collected_data["errors"]["piezometrie"] = piezo_res.error

        # 5. INPN
        if isinstance(inpn_res, Exception):
            collected_data["errors"]["inpn"] = str(inpn_res)
        elif inpn_res:
            collected_data["zonages_naturels"] = [item.model_dump() for item in inpn_res.zonages]
            if inpn_res.error:
                collected_data["errors"]["inpn"] = inpn_res.error

        # 6. Estimation Hydrogéologique de la Nappe au droit du site
        try:
            gw_estimation = groundwater_service.estimate(
                altimetrie=alti_res if not isinstance(alti_res, Exception) else None,
                piezometrie=piezo_res if not isinstance(piezo_res, Exception) else None,
                bss=bss_res if not isinstance(bss_res, Exception) else None,
            )
            collected_data["groundwater_level"] = gw_estimation.model_dump()
        except Exception as gw_exc:
            collected_data["errors"]["groundwater_level"] = str(gw_exc)

        has_errors = bool(collected_data["errors"])
        record.status = "partial_error" if has_errors else "completed"
        record.collected_data = collected_data
        db.commit()
        db.refresh(record)
        return record
    except Exception as exc:
        record.status = "failed"
        record.collected_data = {"error": str(exc)}
        db.commit()
        raise HTTPException(status_code=502, detail=f"Échec de la collecte : {exc}")

@router.get("/{study_id}/export/docx")
def export_study_docx(study_id: int, db: Session = Depends(get_db)):
    record = db.query(StudyModel).filter(StudyModel.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dossier d'étude introuvable.")

    if record.status not in ("completed", "partial_error") or not record.collected_data:
        raise HTTPException(
            status_code=400,
            detail="Veuillez d'abord lancer la collecte des données avant d'exporter le rapport."
        )

    buffer = report_service.generate_docx(
        study_name=record.name,
        address=record.address,
        buffer_meters=record.buffer_meters,
        parcels=record.parcels or [],
        collected_data=record.collected_data or {},
    )

    filename = f"rapport_pre_diagnostic_{study_id}.docx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
