from typing import Literal

from pydantic import BaseModel, Field


ForecastMinute = Literal[
    0,
    30,
    60,
    90,
    180,
]


class FloodPredictionRequest(BaseModel):
    zone_id: str = "Z003"

    forecast_minutes: ForecastMinute = 60

    rainfall_intensity_mm_hr: float = Field(
        default=85.0,
        ge=0,
    )

    drain_load_percent: float = Field(
        default=106.0,
        ge=0,
    )


class FloodPredictionResponse(BaseModel):
    zone_id: str

    forecast_minutes: int

    depth_cm: float

    probability: float

    risk: str

    people_at_risk: int

    drain_status: str

    drain_load_percent: float

    anomaly_probability: float

    drain_priority: str

    confidence: float

    polygon: list[list[list[float]]]

    data_mode: str