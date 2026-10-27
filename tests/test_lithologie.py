import pytest
from soil_up.schemas.altimetrie import AltimetrieResult
from soil_up.schemas.groundwater import GroundwaterLevelEstimation
from soil_up.schemas.bdlisa import BdlisaResult, BdlisaEntity
from soil_up.schemas.bss import BssResult, BssBoreholeItem
from soil_up.services.lithologie import LithologieService

def test_lithologie_synthesize_complete():
    service = LithologieService()

    alti = AltimetrieResult(z_mean=21.1, z_min=20.5, z_max=21.8, denivele=1.3)
    gw = GroundwaterLevelEstimation(
        profondeur_estimee_m=10.3,
        profondeur_min_m=3.1,
        profondeur_max_m=16.4,
        cote_nappe_estimee_ngf=10.8,
        altitude_site_ngf=21.1,
        indice_confiance="Élevé",
        methode_calcul="Moyenne pondérée",
        nb_points_appui=5,
        points_appui=[],
    )
    bdlisa = BdlisaResult(
        aquifere_superficiel=BdlisaEntity(
            code_eh="101AA01",
            libelle_eh="Alluvions de la Seine",
            nature_libelle="Formations alluviales",
            milieu_libelle="Poreux",
            etat_libelle="Libre",
            est_aquifere=True,
            est_affleurant=True,
        ),
        formations=[
            BdlisaEntity(
                code_eh="101AA01",
                libelle_eh="Alluvions de la Seine",
                nature_libelle="Formations alluviales",
                milieu_libelle="Poreux",
                etat_libelle="Libre",
                est_aquifere=True,
                est_affleurant=True,
            ),
            BdlisaEntity(
                code_eh="101BB02",
                libelle_eh="Craie sénonienne",
                nature_libelle="Craie blanche à silex",
                milieu_libelle="Fissuré",
                etat_libelle="Semi-captif",
                est_aquifere=True,
                est_affleurant=False,
            ),
        ],
        nb_formations=2,
    )
    bss = BssResult(
        boreholes=[
            BssBoreholeItem(
                reference="BSS001",
                nature="FORAGE",
                prof_atteinte=18.5,
                prof_eau_sol=10.2,
                coupe_disponible=True,
                nb_scans_coupe=2,
                auteur_coupe="BRGM Laboratoire",
                date_coupe="1985-04-12",
                lieu_dit="Les Prés de la Seine",
                url_infoterre="http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS001",
                latitude=49.44,
                longitude=1.09,
                distance_meters=145.0,
            ),
            BssBoreholeItem(
                reference="BSS002",
                nature="PIEZOMETRE",
                prof_atteinte=12.0,
                coupe_disponible=False,
                url_infoterre="http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=BSS002",
                latitude=49.45,
                longitude=1.10,
                distance_meters=310.0,
            ),
        ],
        total_count=2,
    )

    synthesis = service.synthesize(
        altimetrie=alti,
        groundwater=gw,
        bdlisa=bdlisa,
        bss=bss,
    )

    assert synthesis is not None
    assert synthesis.nb_forages_coupes == 1
    assert synthesis.forage_reference is not None
    assert synthesis.forage_reference["reference"] == "BSS001"
    assert len(synthesis.layers) >= 4

    # Couche 1 : Remblais
    l1 = synthesis.layers[0]
    assert l1.type_couche == "remblais"
    assert l1.profondeur_toit_m == 0.0
    assert l1.profondeur_base_m == 1.5
    assert l1.cote_ngf_toit == 21.1
    assert l1.cote_ngf_base == 19.6

    # Couche 2 : Alluvions vadose
    l2 = synthesis.layers[1]
    assert l2.type_couche == "alluvions"
    assert l2.profondeur_toit_m == 1.5
    assert l2.profondeur_base_m == 10.3

    # Couche 3 : Zone saturée / Aquifère
    l3 = synthesis.layers[2]
    assert l3.type_couche == "aquifere"
    assert l3.profondeur_toit_m == 10.3
    assert l3.est_zone_saturee is True

    # Couche 4 : Substratum
    l4 = synthesis.layers[3]
    assert l4.type_couche == "substratum"
    assert "Craie" in l4.designation or "Substratum" in l4.designation

    # Synthèse rédigée
    assert "remblais anthropiques" in synthesis.description_synthese
    assert "BSS001" in synthesis.description_synthese


def test_lithologie_synthesize_empty_fallback():
    service = LithologieService()
    synthesis = service.synthesize()

    assert synthesis is not None
    assert len(synthesis.layers) == 4
    assert synthesis.nb_forages_coupes == 0
    assert synthesis.forage_reference is None
