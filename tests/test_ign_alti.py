import pytest
import respx
import httpx
from soil_up.services.ign_alti import IgnAltiConnector

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
async def test_ign_alti_connector_success():
    connector = IgnAltiConnector()

    with respx.mock(base_url="https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest") as respx_mock:
        respx_mock.get("/elevation.json").mock(
            return_value=httpx.Response(
                200,
                json={
                    "elevations": [
                        {"lon": 1.0755, "lat": 49.4305, "z": 10.5, "acc": "RGE ALTI"},
                        {"lon": 1.0750, "lat": 49.4300, "z": 9.2, "acc": "RGE ALTI"},
                        {"lon": 1.0760, "lat": 49.4310, "z": 12.8, "acc": "RGE ALTI"},
                    ]
                }
            )
        )

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=100)

        assert result.z_mean == 10.8
        assert result.z_min == 9.2
        assert result.z_max == 12.8
        assert result.denivele == 3.6
        assert result.unit == "m NGF-IGN69"
        assert result.error is None

@pytest.mark.asyncio
async def test_ign_alti_connector_timeout_graceful():
    connector = IgnAltiConnector(timeout=1.0)

    with respx.mock(base_url="https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest") as respx_mock:
        respx_mock.get("/elevation.json").mock(side_effect=httpx.TimeoutException("Read timed out"))

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=100)

        assert result.z_mean is None
        assert result.error is not None
        assert "timed out" in result.error.lower()
