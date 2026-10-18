import pytest
import respx
import httpx
from soil_up.services.inpn import InpnConnector

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
async def test_inpn_connector_success():
    connector = InpnConnector()

    with respx.mock(base_url="https://data.geopf.fr/wfs") as respx_mock:
        # Mocking WFS GetFeature for znieff1
        respx_mock.get("/ows").mock(
            return_value=httpx.Response(
                200,
                json={
                    "type": "FeatureCollection",
                    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}},
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {
                                "id_mnhn": "230030439",
                                "nom_site": "LA MARE GUÉMARE",
                                "url_fiche": "https://inpn.mnhn.fr/zone/znieff/230030439",
                            },
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [1.0800, 49.4320],
                                        [1.0820, 49.4320],
                                        [1.0820, 49.4340],
                                        [1.0800, 49.4340],
                                        [1.0800, 49.4320],
                                    ]
                                ]
                            }
                        }
                    ]
                }
            )
        )

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=2000)

        assert len(result.zonages) >= 1
        z = result.zonages[0]
        assert z.id_mnhn == "230030439"
        assert z.nom_site == "LA MARE GUÉMARE"
        assert "znieff" in z.type_zonage.lower()
        assert z.distance_meters > 0
        assert z.url_fiche == "https://inpn.mnhn.fr/zone/znieff/230030439"
        assert result.error is None

@pytest.mark.asyncio
async def test_inpn_connector_timeout():
    connector = InpnConnector(timeout=1.0)

    with respx.mock(base_url="https://data.geopf.fr/wfs") as respx_mock:
        respx_mock.get("/ows").mock(side_effect=httpx.TimeoutException("Read timed out"))

        result = await connector.collect(emprise_geojson=MOCK_EMPRISE_GEOJSON, buffer_meters=1000)

        assert len(result.zonages) == 0
        assert result.error is not None
        assert "timed out" in result.error.lower()
