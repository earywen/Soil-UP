import pytest
import respx
import httpx
from soil_up.services.hubeau_piezo import HubeauPiezometrieConnector

MOCK_EMPRISE_GEOJSON = {
    "type": "Polygon",
    "coordinates": [
        [
            [1.0750, 49.4300],
            [1.0760, 49.4300],
            [1.0760, 49.4310],
            [1.0750, 49.4310],
            [1.0750, 49.4300],
        ]
    ]
}

@pytest.mark.asyncio
async def test_hubeau_piezo_connector_success():
    connector = HubeauPiezometrieConnector()

    with respx.mock(base_url="https://hubeau.eaufrance.fr/api/v1/niveaux_nappes") as respx_mock:
        # 1. Stations mock
        respx_mock.get("/stations").mock(
            return_value=httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "code_bss": "00994D0188/P2",
                            "bss_id": "BSS000GMTK",
                            "nom_commune": "Rouen",
                            "code_commune_insee": "76540",
                            "altitude_station": "5.98",
                            "profondeur_investigation": 13.0,
                            "geometry": {
                                "type": "Point",
                                "coordinates": [1.0517, 49.4363]
                            }
                        }
                    ]
                }
            )
        )

        # 2. Chroniques mock
        respx_mock.get("/chroniques").mock(
            return_value=httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "code_bss": "00994D0188/P2",
                            "date_mesure": "2024-06-15",
                            "profondeur_nappe": 4.8,
                            "niveau_nappe_eau": 1.18,
                            "qualification": "Correcte"
                        }
                    ]
                }
            )
        )

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=2000)

        assert len(result.stations) == 1
        st = result.stations[0]
        assert st.code_bss == "00994D0188/P2"
        assert st.nom_commune == "Rouen"
        assert st.profondeur_nappe == 4.8
        assert st.cote_ngf == 1.18
        assert st.date_mesure == "2024-06-15"
        assert st.distance_meters > 0
        assert result.error is None

@pytest.mark.asyncio
async def test_hubeau_piezo_connector_timeout():
    connector = HubeauPiezometrieConnector(timeout=1.0)

    with respx.mock(base_url="https://hubeau.eaufrance.fr/api/v1/niveaux_nappes") as respx_mock:
        respx_mock.get("/stations").mock(side_effect=httpx.TimeoutException("Connection timed out"))

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=1000)

        assert len(result.stations) == 0
        assert result.error is not None
        assert "timed out" in result.error.lower()
