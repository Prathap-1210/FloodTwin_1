from pydantic import BaseModel, Field


class RiskClassificationRequest(BaseModel):
    zone_id: str = "Z003"

    flood_depth_cm: float = Field(
        default=42.0,
        ge=0,
    )

    flood_probability: float = Field(
        default=0.88,
        ge=0,
        le=1,
    )

    people_at_risk: int = Field(
        default=500,
        ge=0,
    )

    drain_load_percent: float = Field(
        default=106.0,
        ge=0,
    )

    anomaly_probability: float = Field(
        default=0.87,
        ge=0,
        le=1,
    )


class RiskClassificationResponse(BaseModel):
    zone_id: str

    risk_level: str

    priority: str

    risk_score: float

    evacuation_required: bool

    road_restriction_required: bool

    drainage_intervention_required: bool

    reason: str

    data_mode: str