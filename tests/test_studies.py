import pytest
from httpx import AsyncClient, ASGITransport
from soil_up.main import app

SAMPLE_EMPRISE_GEOJSON = {
    "type": "Polygon",
    "coordinates": [
        [[2.330, 48.869], [2.332, 48.869], [2.332, 48.871], [2.330, 48.871], [2.330, 48.869]]
    ]
}

@pytest.mark.asyncio
async def test_create_and_retrieve_study():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create study
        create_payload = {
            "name": "Diagnostic Ancien Garage",
            "address": "10 Rue de la Paix 75002 Paris",
            "emprise": SAMPLE_EMPRISE_GEOJSON,
            "buffer_meters": 500,
            "parcels": [
                {"idu": "75102000AB0001", "section": "AB", "numero": "0001", "contenance": 450}
            ]
        }
        res_create = await client.post("/api/studies/", json=create_payload)
        assert res_create.status_code == 201
        created = res_create.json()
        assert "id" in created
        study_id = created["id"]
        assert created["name"] == "Diagnostic Ancien Garage"
        assert created["status"] == "draft"
        assert created["buffer_meters"] == 500

        # 2. List studies
        res_list = await client.get("/api/studies/")
        assert res_list.status_code == 200
        studies = res_list.json()
        assert any(s["id"] == study_id for s in studies)

        # 3. Retrieve single study
        res_get = await client.get(f"/api/studies/{study_id}")
        assert res_get.status_code == 200
        detail = res_get.json()
        assert detail["id"] == study_id
        assert detail["emprise"]["type"] == "Polygon"
        assert len(detail["parcels"]) == 1
        assert detail["parcels"][0]["idu"] == "75102000AB0001"

@pytest.mark.asyncio
async def test_update_study_details():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create
        create_payload = {
            "name": "Site Industriel Nord",
            "address": "15 Avenue des Champs-Élysées 75008 Paris",
            "emprise": SAMPLE_EMPRISE_GEOJSON,
            "buffer_meters": 500
        }
        res_create = await client.post("/api/studies/", json=create_payload)
        assert res_create.status_code == 201
        study_id = res_create.json()["id"]

        # Update
        update_payload = {
            "name": "Site Industriel Nord - Révisé",
            "buffer_meters": 1000
        }
        res_put = await client.put(f"/api/studies/{study_id}", json=update_payload)
        assert res_put.status_code == 200
        updated = res_put.json()
        assert updated["name"] == "Site Industriel Nord - Révisé"
        assert updated["buffer_meters"] == 1000

@pytest.mark.asyncio
async def test_get_non_existent_study_returns_404():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/studies/999999")
        assert response.status_code == 404
