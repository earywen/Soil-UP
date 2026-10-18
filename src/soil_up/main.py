from fastapi import FastAPI
from soil_up.routers.address import router as address_router
from soil_up.routers.cadastre import router as cadastre_router

app = FastAPI(
    title="Soil'UP API",
    version="0.1.0",
    description="API de diagnostic documentaire et environnemental pour les sites et sols pollués",
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(address_router)
app.include_router(cadastre_router)
