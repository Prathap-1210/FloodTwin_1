from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    zone_id: str = "Z003"

    destination_id: str = "CAMP_A"

    forecast_minutes: int = Field(
        default=60,
        ge=0,
    )

    flood_risk: str = "SEVERE"

    flood_depth_cm: float = Field(
        default=42.0,
        ge=0,
    )

    origin_latitude: float = 12.9823

    origin_longitude: float = 80.2224

    destination_latitude: float = 12.9900

    destination_longitude: float = 80.2140


class RouteGeometry(BaseModel):
    type: str = "LineString"

    coordinates: list[
        list[float]
    ]


class RouteOption(BaseModel):
    route_id: str

    name: str

    distance_km: float

    duration_min: int

    safety_status: str

    flood_exposure: str

    intersects_flood_zone: bool

    intersects_r12: bool

    geometry: RouteGeometry


class SafeRouteResponse(BaseModel):
    zone_id: str

    destination_id: str

    forecast_minutes: int

    fastest_route: RouteOption

    safe_route: RouteOption

    recommended_route_id: str

    additional_distance_km: float

    additional_time_min: int

    decision_reason: str

    data_mode: str