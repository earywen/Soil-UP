import pytest
import respx
import httpx
from httpx import AsyncClient, ASGITransport
from soil_up.main import app

IGN_PARCEL_SAMPLE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "parcelle.94548216",
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [
                    [[
                        [2.33100895, 48.86951856],
                        [2.33120761, 48.86943072],
                        [2.33099913, 48.86922163],
                        [2.33079951, 48.8693091],
                        [2.33100895, 48.86951856]
                    ]]
                ]
            },
            "properties": {
                "idu": "75102000AB0075",
                "section": "AB",
                "numero": "0075",
                "nom_com": "Paris",
                "code_insee": "75056",
                "contenance": 489
            }
        }
    ]
}

PARCEL_1 = {
    "type": "Feature",
    "id": "parcelle.1",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [[2.330, 48.869], [2.331, 48.869], [2.331, 48.870], [2.330, 48.870], [2.330, 48.869]]
        ]
    },
    "properties": {
        "idu": "75102000AB0001",
        "section": "AB",
        "numero": "0001",
        "contenance": 100
    }
}

PARCEL_2 = {
    "type": "Feature",
    "id": "parcelle.2",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [[2.331, 48.869], [2.332, 48.869], [2.332, 48.870], [2.331, 48.870], [2.331, 48.869]]
        ]
    },
    "properties": {
        "idu": "75102000AB0002",
        "section": "AB",
        "numero": "0002",
        "contenance": 150
    }
}

@pytest.mark.asyncio
@respx.mock
async def test_get_parcels_by_coordinates_returns_features():
    respx.get("https://apicarto.ign.fr/api/cadastre/parcelle").mock(
        return_value=httpx.Response(200, json=IGN_PARCEL_SAMPLE)
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/cadastre/parcels", params={"lat": 48.869374, "lon": 2.330999})
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 1
        parcel = data["features"][0]
        assert parcel["properties"]["idu"] == "75102000AB0075"
        assert parcel["properties"]["section"] == "AB"
        assert parcel["properties"]["numero"] == "0075"
        assert parcel["properties"]["nom_com"] == "Paris"
        assert parcel["properties"]["contenance"] == 489
        assert parcel["geometry"]["type"] == "MultiPolygon"

@pytest.mark.asyncio
async def test_compute_parcels_union_merges_geometries_and_calculates_surface():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"features": [PARCEL_1, PARCEL_2]}
        response = await client.post("/api/cadastre/parcels/union", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "Feature"
        props = data["properties"]
        assert props["parcel_ids"] == ["75102000AB0001", "75102000AB0002"]
        assert props["parcels_count"] == 2
        assert props["contenance_cadastrale_totale"] == 250
        assert props["calculated_area_m2"] > 0
        assert data["geometry"]["type"] in ("Polygon", "MultiPolygon")

@pytest.mark.asyncio
async def test_compute_parcels_union_empty_list_returns_400():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"features": []}
        response = await client.post("/api/cadastre/parcels/union", json=payload)
        assert response.status_code == 400
        assert "Au moins une parcelle est requise" in response.json()["detail"]
