import os

from fastapi import (
    Depends,
    FastAPI,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from app.api.flood import (
    router as flood_router,
)

from app.api.drainage import (
    router as drainage_router,
)

from app.api.risk import (
    router as risk_router,
)

from app.api.evacuation import (
    router as evacuation_router,
)

from app.api.routes import (
    router as routes_router,
)

from app.api.response import (
    router as response_router,
)

from app.api import map_context

from app.api import tasks

from app.core.supabase_client import supabase
from app.core.auth import require_operator

from app.api.ml import (
    router as ml_router,
)


app = FastAPI(
    title="FloodTwin AI API",

    description=(
        "Urban Flood Nowcasting and "
        "Response Intelligence Platform"
    ),

    version="0.1.0",
)


# ========================================================
# CORS
# ========================================================

configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # Capacitor / Android
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
        *configured_origins,
    ],

    # Vite selects the next free port (for example 5174) when 5173 is busy.
    # Restrict the pattern to loopback hosts while allowing that port change.
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    ),

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ========================================================
# ROUTERS
# ========================================================

protected_dependencies = [
    Depends(require_operator),
]

app.include_router(
    flood_router,
    dependencies=protected_dependencies,
)

app.include_router(
    drainage_router,
    dependencies=protected_dependencies,
)

app.include_router(
    risk_router,
    dependencies=protected_dependencies,
)

app.include_router(
    ml_router,
)

app.include_router(
    evacuation_router,
    dependencies=protected_dependencies,
)

app.include_router(
    routes_router,
    dependencies=protected_dependencies,
)

app.include_router(
    response_router,
    dependencies=protected_dependencies,
)

app.include_router(
    map_context.router,
    prefix="/api",
    dependencies=protected_dependencies,
)

app.include_router(
    tasks.router,
    prefix="/api",
    dependencies=protected_dependencies,
)


# ========================================================
# ROOT
# ========================================================

@app.get("/")
def root():
    return {
        "project": "FloodTwin AI",
        "status": "running",
        "api_version": "0.1.0",
    }


# ========================================================
# HEALTH
# ========================================================

@app.get("/api/health")
def health():
    try:
        (
            supabase
            .table("tasks")
            .select("task_id")
            .limit(1)
            .execute()
        )
    except Exception as exc:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail=(
                "FloodTwin API is running, but Supabase "
                "is unavailable or the tasks table is inaccessible."
            ),
        ) from exc

    return {
        "status": "ok",
        "service": "FloodTwin API",
        "database": "connected",
    }
