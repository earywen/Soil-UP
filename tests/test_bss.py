import pytest
import respx
import httpx
from soil_up.services.bss import BssConnector

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
async def test_bss_connector_success():
    connector = BssConnector()

    with respx.mock(base_url="http://geoservices.brgm.fr") as respx_mock:
        respx_mock.get("/geologie").mock(
            return_value=httpx.Response(
                200,
                json={
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {
                                "reference": "00994X0356/111111",
                                "bss_id": "BSS000GNGE",
                                "nature": "FORAGE",
                                "prof_atteinte": "203.84",
                                "zsol": "9",
                                "nb_scans_coupe": "6",
                                "log_geol_valide": "Present",
                                "documents": "COUPE-GEOLOGIQUE",
                                "nom_commune": "PETIT QUEVILLY",
                            },
                            "geometry": {
                                "type": "Point",
                                "coordinates": [1.0688, 49.4306]
                            }
                        }
                    ]
                }
            )
        )

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=1000)

        assert len(result.boreholes) == 1
        b = result.boreholes[0]
        assert b.reference == "00994X0356/111111"
        assert b.bss_id == "BSS000GNGE"
        assert b.nature == "FORAGE"
        assert b.prof_atteinte == 203.84
        assert b.zsol == 9.0
        assert b.coupe_disponible is True
        assert b.url_infoterre == "http://ficheinfoterre.brgm.fr/InfoterreFiche/ficheBss.action?id=00994X0356/111111"
        assert b.distance_meters > 0
        assert result.error is None

@pytest.mark.asyncio
async def test_bss_connector_timeout():
    connector = BssConnector(timeout=1.0)

    with respx.mock(base_url="http://geoservices.brgm.fr") as respx_mock:
        respx_mock.get("/geologie").mock(side_effect=httpx.TimeoutException("Read timed out"))

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=1000)

        assert len(result.boreholes) == 0
        assert result.error is not None
        assert "timed out" in result.error.lower()
