import pytest
import respx
import httpx
from httpx import AsyncClient, ASGITransport
from soil_up.main import app

SAMPLE_EMPRISE_GEOJSON = {
    "type": "Polygon",
    "coordinates": [
        [[2.330, 48.869], [2.332, 48.869], [2.332, 48.871], [2.330, 48.871], [2.330, 48.869]]
    ]
}

SAMPLE_CASIAS_RESPONSE = {
    "results": 1,
    "data": [
        {
            "identifiant_ssp": "SSP3865182",
            "identifiant_casias": "IDF7500001",
            "nom_etablissement": "Ancienne Station-Service Opéra",
            "activite_principale": "Commerce de détail de carburants",
            "adresse": "4 rue Chaussée d'Antin",
            "nom_commune": "Paris",
            "statut": "En arrêt",
            "fiche_risque": "https://fiches-risques.brgm.fr/georisques/casias/SSP3865182",
            "geom": {"type": "Point", "coordinates": [2.333, 48.872]}
        }
    ]
}

SAMPLE_ICPE_RESPONSE = {
    "results": 1,
    "data": [
        {
            "codeAIOT": "0007407767",
            "raisonSociale": "Centrale Thermique Vendôme",
            "commune": "Paris",
            "codePostal": "75001",
            "etatActivite": "En exploitation",
            "latitude": 48.867452,
            "longitude": 2.330799
        }
    ]
}

@pytest.mark.asyncio
@respx.mock
async def test_collect_georisques_data_for_study():
    # Mock external Georisques endpoints
    respx.get("https://www.georisques.gouv.fr/api/v1/ssp/casias").mock(
        return_value=httpx.Response(200, json=SAMPLE_CASIAS_RESPONSE)
    )
    respx.get("https://www.georisques.gouv.fr/api/v1/installations_classees").mock(
        return_value=httpx.Response(200, json=SAMPLE_ICPE_RESPONSE)
    )
    # Mock IGN Alti
    respx.get("https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json").mock(
        return_value=httpx.Response(200, json={"elevations": [{"lon": 2.33, "lat": 48.87, "z": 38.5, "acc": "RGE ALTI"}]})
    )
    # Mock BRGM BSS
    respx.get("http://geoservices.brgm.fr/geologie").mock(
        return_value=httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    )
    # Mock Hub'Eau
    respx.get("https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations").mock(
        return_value=httpx.Response(200, json={"data": []})
    )
    # Mock INPN WFS
    respx.get("https://data.geopf.fr/wfs/ows").mock(
        return_value=httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create a study
        create_payload = {
            "name": "Audit Environnemental Opéra",
            "address": "Opéra Garnier Paris",
            "emprise": SAMPLE_EMPRISE_GEOJSON,
            "buffer_meters": 500
        }
        res_create = await client.post("/api/studies/", json=create_payload)
        assert res_create.status_code == 201
        study_id = res_create.json()["id"]

        # 2. Trigger data collection
        res_collect = await client.post(f"/api/studies/{study_id}/collect")
        assert res_collect.status_code == 200
        collected = res_collect.json()
        assert collected["status"] == "completed"
        assert "collected_data" in collected
        cdata = collected["collected_data"]
        
        # Verify CASIAS results
        assert "casias" in cdata
        assert len(cdata["casias"]) == 1
        site = cdata["casias"][0]
        assert site["identifiant"] == "IDF7500001"
        assert site["nom_etablissement"] == "Ancienne Station-Service Opéra"
        assert site["statut"] == "En arrêt"
        assert "distance_meters" in site
        assert isinstance(site["distance_meters"], (int, float))

        # Verify ICPE results
        assert "icpe" in cdata
        assert len(cdata["icpe"]) == 1
        icpe = cdata["icpe"][0]
        assert icpe["code_aiot"] == "0007407767"
        assert icpe["raison_sociale"] == "Centrale Thermique Vendôme"
        assert "distance_meters" in icpe

        # Verify Jalon 2 datasets
        assert "altimetrie" in cdata
        assert cdata["altimetrie"]["z_mean"] == 38.5
        assert "bss" in cdata
        assert "piezometrie" in cdata
        assert "zonages_naturels" in cdata

@pytest.mark.asyncio
@respx.mock
async def test_collect_partial_failure_is_resilient():
    # CASIAS succeeds, ICPE returns 500
    respx.get("https://www.georisques.gouv.fr/api/v1/ssp/casias").mock(
        return_value=httpx.Response(200, json=SAMPLE_CASIAS_RESPONSE)
    )
    respx.get("https://www.georisques.gouv.fr/api/v1/installations_classees").mock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_create = await client.post("/api/studies/", json={
            "name": "Audit Partiel",
            "address": "Paris",
            "emprise": SAMPLE_EMPRISE_GEOJSON,
            "buffer_meters": 500
        })
        study_id = res_create.json()["id"]

        res_collect = await client.post(f"/api/studies/{study_id}/collect")
        assert res_collect.status_code == 200
        collected = res_collect.json()
        assert collected["status"] == "partial_error"
        # CASIAS is still present despite ICPE failure
        assert len(collected["collected_data"]["casias"]) == 1
        assert "errors" in collected["collected_data"]
