from __future__ import annotations

from typing import Literal

from fastapi import (
    APIRouter,
    HTTPException,
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from ml.orchestrator import (
    run_floodtwin_ml,
)

from ml.scanner import (
    scan_flood_locations,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/ml",
    tags=["FloodTwin ML"],
)


# ============================================================
# COMMON TYPES
# ============================================================

ForecastMinutes = Literal[
    30,
    60,
    90,
    180,
]

WaterLevelTrend = Literal[
    "FALLING",
    "STABLE",
    "RISING",
]

ActionFlag = Literal[
    0,
    1,
]


# ============================================================
# BASE REQUEST MODEL
# ============================================================

class FloodTwinBaseModel(
    BaseModel,
):
    """
    Shared Pydantic configuration.

    Unknown fields are ignored so the API remains
    backward-compatible while the prototype evolves.
    """

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
    )


# ============================================================
# FULL SIX-MODEL REQUEST
# ============================================================

class FloodTwinMLRequest(
    FloodTwinBaseModel,
):

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    zone_id: str = Field(
        min_length=1,
    )

    location_name: (
        str | None
    ) = None

    latitude: (
        float | None
    ) = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: (
        float | None
    ) = Field(
        default=None,
        ge=-180,
        le=180,
    )

    # --------------------------------------------------------
    # FORECAST
    # --------------------------------------------------------

    forecast_minutes: (
        ForecastMinutes
    ) = 60

    # --------------------------------------------------------
    # RAINFALL
    # --------------------------------------------------------

    rainfall_mm_hr: float = Field(
        ge=0,
    )

    recent_rainfall_mm: float = Field(
        ge=0,
    )

    antecedent_rainfall_mm: float = Field(
        ge=0,
    )

    # --------------------------------------------------------
    # MODEL 1 — FLOOD / GIS
    # --------------------------------------------------------

    elevation_m: float

    slope_deg: float = Field(
        ge=0,
    )

    built_up_percent: float = Field(
        ge=0,
        le=100,
    )

    distance_to_nearest_drain_m: float = Field(
        ge=0,
    )

    drain_density_m_per_km2: float = Field(
        ge=0,
    )

    previous_depth_cm: float = Field(
        ge=0,
    )

    # --------------------------------------------------------
    # MODEL 2 — DRAINAGE
    # --------------------------------------------------------

    drain_id: str = Field(
        min_length=1,
    )

    c2_diameter_m: float = Field(
        gt=0,
    )

    capacity_percent: float = Field(
        ge=0,
    )

    upstream_load_percent: float = Field(
        ge=0,
    )

    downstream_load_percent: float = Field(
        ge=0,
    )

    normal_capacity_percent: float = Field(
        ge=0,
    )

    # --------------------------------------------------------
    # MODEL 3 — HOTSPOT
    # --------------------------------------------------------

    people_at_risk: int = Field(
        ge=0,
    )

    hospital_nearby: bool = False

    major_road_affected: bool = False

    water_level_trend: (
        WaterLevelTrend
    ) = "RISING"

    vulnerable_count: int = Field(
        default=0,
        ge=0,
    )

    # --------------------------------------------------------
    # MODEL 4 — ROAD RISK
    # --------------------------------------------------------

    distance_to_hotspot_m: float = Field(
        ge=0,
    )

    road_elevation_m: float

    road_type: str = Field(
        min_length=1,
    )

    # --------------------------------------------------------
    # MODEL 5 — EVACUATION
    # --------------------------------------------------------

    population: int = Field(
        ge=0,
    )

    water_rise_rate_cm_hr: float = Field(
        ge=0,
    )

    distance_to_shelter_km: float = Field(
        ge=0,
    )

    vulnerability_index: float = Field(
        ge=0,
        le=1,
    )

    # --------------------------------------------------------
    # MODEL 6 — RESPONSE EFFECTIVENESS
    # --------------------------------------------------------

    clear_drain: (
        ActionFlag
    ) = 1

    deploy_pump: (
        ActionFlag
    ) = 1

    close_road: (
        ActionFlag
    ) = 1

    evacuate: (
        ActionFlag
    ) = 1

    pump_capacity_index: float = Field(
        default=0.8,
        ge=0,
        le=1,
    )

    response_delay_min: float = Field(
        default=20,
        ge=0,
    )


# ============================================================
# DYNAMIC CHENNAI FLOOD SCAN REQUEST
# ============================================================

class FloodScanRequest(
    FloodTwinBaseModel,
):

    forecast_minutes: (
        ForecastMinutes
    ) = 60

    rainfall_mm_hr: float = Field(
        ge=0,
    )

    recent_rainfall_mm: float = Field(
        ge=0,
    )

    antecedent_rainfall_mm: float = Field(
        ge=0,
    )

    minimum_probability: float = Field(
        default=0.40,
        ge=0,
        le=1,
    )

    minimum_depth_cm: float = Field(
        default=5.0,
        ge=0,
    )

    limit: int = Field(
        default=100,
        ge=1,
        le=500,
    )

    previous_depth_mode: Literal[
        "reference",
        "zero",
    ] = "reference"


# ============================================================
# HEALTH / INFORMATION
# ============================================================

@router.get(
    "/info",
)
def get_ml_info() -> dict:
    """
    Lightweight health/information endpoint for
    the FloodTwin six-model ML pipeline.
    """

    return {
        "system":
            "FloodTwin AI",

        "status":
            "online",

        "pipeline":
            (
                "Predict → Diagnose → "
                "Decide → Re-simulate"
            ),

        "endpoints": {
            "scan":
                "/api/ml/scan",

            "run":
                "/api/ml/run",

            "info":
                "/api/ml/info",
        },

        "models": [
            {
                "model":
                    1,

                "name":
                    "Flood Prediction",
            },
            {
                "model":
                    2,

                "name":
                    "Drainage Anomaly",
            },
            {
                "model":
                    3,

                "name":
                    "Hotspot Priority",
            },
            {
                "model":
                    4,

                "name":
                    "Road Risk",
            },
            {
                "model":
                    5,

                "name":
                    "Evacuation Demand",
            },
            {
                "model":
                    6,

                "name":
                    "Response Effectiveness",
            },
        ],

        "supported_forecast_minutes": [
            30,
            60,
            90,
            180,
        ],

        "scan_region":
            "Chennai GIS context",
    }


# ============================================================
# DYNAMIC CHENNAI FLOOD SCAN
# ============================================================

@router.post(
    "/scan",
)
def scan_chennai_flood(
    request:
        FloodScanRequest,
) -> dict:
    """
    Run Model 1 across the Chennai GIS feature table.

    The endpoint returns the most affected locations,
    mapped infrastructure context and dynamic bounds
    for frontend map fitting.
    """

    try:
        result = (
            scan_flood_locations(
                rainfall_mm_hr=
                    request
                    .rainfall_mm_hr,

                recent_rainfall_mm=
                    request
                    .recent_rainfall_mm,

                antecedent_rainfall_mm=
                    request
                    .antecedent_rainfall_mm,

                forecast_minutes=
                    request
                    .forecast_minutes,

                previous_depth_mode=
                    request
                    .previous_depth_mode,

                minimum_probability=
                    request
                    .minimum_probability,

                minimum_depth_cm=
                    request
                    .minimum_depth_cm,

                limit=
                    request
                    .limit,
            )
        )

        if not isinstance(
            result,
            dict,
        ):
            raise RuntimeError(
                "Flood scanner returned an invalid response."
            )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(
                exc
            ),
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Required FloodTwin scan data "
                f"was not found: {exc}"
            ),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "FloodTwin flood scan failed: "
                f"{exc}"
            ),
        ) from exc


# ============================================================
# RUN COMPLETE SIX-MODEL PIPELINE
# ============================================================

@router.post(
    "/run",
)
def run_ml_pipeline(
    request:
        FloodTwinMLRequest,
) -> dict:
    """
    Run the complete FloodTwin chain:

    Model 1 -> Model 2 -> Model 3 ->
    Model 4 -> Model 5 -> Model 6.
    """

    try:
        payload = (
            request.model_dump()
        )

        result = (
            run_floodtwin_ml(
                payload
            )
        )

        if not isinstance(
            result,
            dict,
        ):
            raise RuntimeError(
                "FloodTwin orchestrator returned an invalid response."
            )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(
                exc
            ),
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Required FloodTwin model or data "
                f"file was not found: {exc}"
            ),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "FloodTwin ML pipeline failed: "
                f"{exc}"
            ),
        ) from exc