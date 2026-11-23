
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from . import models
from .routes import router


# =========================================================
# DATABASE INITIALISATION
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="SmartMunicipality AI",
    description=(
        "Community issue reporting, AI-assisted classification "
        "and municipal service tracking."
    ),
    version="0.1.0"
)


# =========================================================
# CORS CONFIGURATION
# =========================================================

origins = [
    item.strip()
    for item in settings.cors_origins.split(",")
    if item.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# COMPLAINT PHOTO STORAGE
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads" / "complaints"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(BASE_DIR / "uploads")),
    name="uploads"
)


# =========================================================
# API ROUTES
# =========================================================

app.include_router(router)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to SmartMunicipality AI API",
        "status": "running",
        "docs": "/docs"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

