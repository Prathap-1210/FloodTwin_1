from pydantic import BaseModel, Field


class CampAllocation(BaseModel):
    camp_id: str
    camp_name: str
    capacity: int
    allocated: int
    remaining_capacity: int


class EvacuationPlanRequest(BaseModel):
    zone_id: str = "Z003"

    people_at_risk: int = Field(
        default=500,
        ge=0,
    )

    risk_level: str = "SEVERE"

    origin_latitude: float = 12.9823

    origin_longitude: float = 80.2224


class EvacuationPlanResponse(BaseModel):
    zone_id: str

    evacuation_required: bool

    people_at_risk: int

    total_capacity: int

    allocated_people: int

    unallocated_people: int

    evacuation_readiness_percent: float

    assignments: list[CampAllocation]

    primary_camp: str | None

    secondary_camp: str | None

    route_strategy: str

    status: str

    data_mode: str