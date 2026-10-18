import pytest
from httpx import AsyncClient, ASGITransport
from soil_up.main import app

SAMPLE_CUSTOM_POLYGON = {
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
async def test_compute_custom_emprise_surface():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"geometry": SAMPLE_CUSTOM_POLYGON}
        resp = await client.post("/api/cadastre/custom-emprise", json=payload)

        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "Feature"
        assert data["geometry"]["type"] == "Polygon"
        assert "calculated_area_m2" in data["properties"]
        assert data["properties"]["calculated_area_m2"] > 5000  # Env 8000 m²
        assert data["properties"]["custom_drawing"] is True

@pytest.mark.asyncio
async def test_compute_custom_emprise_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Moins de 3 points
        invalid_geom = {
            "type": "Polygon",
            "coordinates": [[[1.0, 49.0], [1.1, 49.1]]]
        }
        resp = await client.post("/api/cadastre/custom-emprise", json={"geometry": invalid_geom})
        assert resp.status_code == 400
