from pydantic import BaseModel, Field

from app.schemas.flood import ForecastMinute


class DrainageAnalysisRequest(BaseModel):
    drain_id: str = "D17"

    forecast_minutes: ForecastMinute = 60

    rainfall_intensity_mm_hr: float = Field(
        default=85.0,
        ge=0,
    )

    observed_load_percent: float = Field(
        default=106.0,
        ge=0,
    )


class DrainageAnalysisResponse(BaseModel):
    drain_id: str

    forecast_minutes: int

    status: str

    load_percent: float

    anomaly_probability: float

    priority: str

    confidence: float

    likely_cause: str

    recommended_action: str

    data_mode: str