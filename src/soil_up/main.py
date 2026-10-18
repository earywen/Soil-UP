from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from soil_up.database import init_db
from soil_up.routers.address import router as address_router
from soil_up.routers.cadastre import router as cadastre_router
from soil_up.routers.studies import router as studies_router

# Ensure tables are initialized
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Soil'UP API",
    version="0.1.0",
    description="API de diagnostic documentaire et environnemental pour les sites et sols pollués",
    lifespan=lifespan,
)

# Enable CORS for local network and frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(address_router)
app.include_router(cadastre_router)
app.include_router(studies_router)
