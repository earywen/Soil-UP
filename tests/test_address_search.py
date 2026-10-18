import pytest
import respx
import httpx
from httpx import AsyncClient, ASGITransport
from soil_up.main import app

BAN_SAMPLE_RESPONSE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [2.330999, 48.869374]
            },
            "properties": {
                "label": "10 Rue de la Paix 75002 Paris",
                "score": 0.95,
                "id": "75102_6970_00010",
                "name": "10 Rue de la Paix",
                "postcode": "75002",
                "citycode": "75102",
                "city": "Paris",
                "context": "75, Paris, Île-de-France",
                "type": "housenumber"
            }
        }
    ]
}

@pytest.mark.asyncio
@respx.mock
async def test_search_address_returns_normalized_results():
    respx.get("https://api-adresse.data.gouv.fr/search/").mock(
        return_value=httpx.Response(200, json=BAN_SAMPLE_RESPONSE)
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/address/search", params={"q": "10 rue de la paix paris"})
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 1
        first = data["results"][0]
        assert first["label"] == "10 Rue de la Paix 75002 Paris"
        assert first["city"] == "Paris"
        assert first["postcode"] == "75002"
        assert first["citycode"] == "75102"
        assert first["latitude"] == 48.869374
        assert first["longitude"] == 2.330999
        assert first["context"] == "75, Paris, Île-de-France"
        assert first["score"] == 0.95

@pytest.mark.asyncio
async def test_search_address_empty_query_returns_validation_error():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/address/search", params={"q": ""})
        assert response.status_code == 422

@pytest.mark.asyncio
@respx.mock
async def test_search_address_when_ban_fails_returns_502():
    respx.get("https://api-adresse.data.gouv.fr/search/").mock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/address/search", params={"q": "rue de la paix"})
        assert response.status_code == 502
        assert "Erreur de communication avec l'API BAN" in response.json()["detail"]

@pytest.mark.asyncio
@respx.mock
async def test_search_address_when_ban_times_out_returns_502():
    respx.get("https://api-adresse.data.gouv.fr/search/").mock(
        side_effect=httpx.TimeoutException("Connection timed out")
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/address/search", params={"q": "rue de la paix"})
        assert response.status_code == 502
        assert "Erreur de communication avec l'API BAN" in response.json()["detail"]
