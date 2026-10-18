from typing import List
import httpx
from soil_up.schemas.address import AddressResultItem

BAN_API_URL = "https://api-adresse.data.gouv.fr/search/"

class BanAddressService:
    def __init__(self, base_url: str = BAN_API_URL, timeout: float = 10.0):
        self.base_url = base_url
        self.timeout = timeout

    async def search(self, query: str, limit: int = 5) -> List[AddressResultItem]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(self.base_url, params={"q": query, "limit": limit})
            response.raise_for_status()
            data = response.json()

        results: List[AddressResultItem] = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            coords = geom.get("coordinates", [0.0, 0.0])
            
            # GeoJSON coordinates are [lon, lat]
            lon = coords[0] if len(coords) > 0 else 0.0
            lat = coords[1] if len(coords) > 1 else 0.0
            
            results.append(
                AddressResultItem(
                    label=props.get("label", ""),
                    name=props.get("name"),
                    postcode=props.get("postcode", ""),
                    citycode=props.get("citycode", ""),
                    city=props.get("city", ""),
                    context=props.get("context"),
                    latitude=lat,
                    longitude=lon,
                    score=float(props.get("score", 0.0)),
                )
            )
        return results
