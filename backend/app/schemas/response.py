from pydantic import BaseModel, Field


# ========================================================
# RESPONSE RECOMMENDATION
# ========================================================


class ResponseRecommendationRequest(BaseModel):
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

    drain_id: str = "D17"

    drain_status: str = "PROBABLE_BLOCKAGE"

    drain_load_percent: float = Field(
        default=106.0,
        ge=0,
    )

    anomaly_probability: float = Field(
        default=0.87,
        ge=0,
        le=1,
    )

    road_id: str = "R12"

    evacuation_required: bool = True


class ResponseAction(BaseModel):
    action_id: str

    priority: str

    category: str

    title: str

    target: str

    reason: str

    recommended: bool


class ResponseRecommendationResponse(BaseModel):
    zone_id: str

    incident_level: str

    actions: list[ResponseAction]

    total_actions: int

    p1_actions: int

    immediate_action_required: bool

    decision_summary: str

    data_mode: str


# ========================================================
# INTERVENTION SELECTION
# ========================================================


class InterventionSelection(BaseModel):
    clear_drain_d17: bool = True

    deploy_pump_p2: bool = True

    close_road_r12: bool = True

    evacuate_z003: bool = True


# ========================================================
# RESPONSE SIMULATION REQUEST
# ========================================================


class ResponseSimulationRequest(BaseModel):
    zone_id: str = "Z003"

    flood_depth_cm: float = Field(
        default=42.0,
        ge=0,
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

    interventions: InterventionSelection


# ========================================================
# SCENARIO STATE
# ========================================================


class ScenarioState(BaseModel):
    flood_depth_cm: float

    people_exposed: int

    drain_load_percent: float

    anomaly_probability: float

    road_status: str

    hospital_access: str


# ========================================================
# RESPONSE SIMULATION RESPONSE
# ========================================================


class ResponseSimulationResponse(BaseModel):
    zone_id: str

    before: ScenarioState

    after: ScenarioState

    depth_reduction_cm: float

    exposure_reduction: int

    drain_load_reduction_percent: float

    selected_actions: int

    simulation_status: str

    data_mode: str