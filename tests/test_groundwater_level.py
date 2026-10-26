import pytest
from soil_up.schemas.altimetrie import AltimetrieResult
from soil_up.schemas.piezometrie import PiezometrieResult, PiezometreItem
from soil_up.schemas.bss import BssResult, BssBoreholeItem
from soil_up.services.groundwater_level import GroundwaterLevelService

def test_groundwater_level_with_bss_and_piezo():
    service = GroundwaterLevelService()

    alti = AltimetrieResult(z_mean=15.0, z_min=14.0, z_max=16.0, denivele=2.0)

    piezo = PiezometrieResult(
        stations=[
            PiezometreItem(
                code_bss="00994X0709/PZ3",
                nom_commune="Rouen",
                distance_meters=250.0,
                profondeur_nappe=3.8,
                cote_ngf=11.2, # 15.0 - 11.2 = 3.8m
                latitude=49.44,
                longitude=1.09,
                url_infoterre="http://test",
            )
        ]
    )

    bss = BssResult(
        boreholes=[
            BssBoreholeItem(
                reference="01001N0520/T7",
                nom_commune="Rouen",
                distance_meters=140.0,
                prof_atteinte=10.0,
                zsol=14.5,
                prof_eau_sol=3.0,
                date_eau_sol="1980-05-12",
                cote_eau_calculee=11.5, # 14.5 - 3.0 = 11.5m -> au site (15.0 - 11.5) = 3.5m
                latitude=49.441,
                longitude=1.091,
                url_infoterre="http://test",
            ),
            BssBoreholeItem(
                reference="01001N0613/T1",
                nom_commune="Rouen",
                distance_meters=210.0,
                prof_atteinte=12.0,
                zsol=15.2,
                prof_eau_sol=3.4,
                cote_eau_calculee=11.8, # 15.2 - 3.4 = 11.8m -> au site (15.0 - 11.8) = 3.2m
                latitude=49.442,
                longitude=1.092,
                url_infoterre="http://test",
            ),
        ]
    )

    estimation = service.estimate(altimetrie=alti, piezometrie=piezo, bss=bss)

    assert estimation.profondeur_estimee_m is not None
    assert 3.0 <= estimation.profondeur_estimee_m <= 4.0
    assert estimation.profondeur_min_m <= estimation.profondeur_estimee_m <= estimation.profondeur_max_m
    assert estimation.cote_nappe_estimee_ngf is not None
    assert estimation.indice_confiance == "Élevé"
    assert estimation.nb_points_appui == 3
    assert len(estimation.points_appui) == 3

def test_groundwater_level_empty():
    service = GroundwaterLevelService()
    estimation = service.estimate(altimetrie=None, piezometrie=None, bss=None)
    assert estimation.profondeur_estimee_m is None
    assert estimation.indice_confiance == "Non déterminé"
    assert estimation.nb_points_appui == 0
