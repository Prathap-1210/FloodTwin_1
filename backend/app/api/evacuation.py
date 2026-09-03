from fastapi import (
    APIRouter,
)

from app.schemas.evacuation import (
    EvacuationPlanRequest,
    EvacuationPlanResponse,
)

from app.services.evacuation_service import (
    create_evacuation_plan,
)


router = APIRouter(
    prefix="/api/evacuation",
    tags=["Evacuation Planning"],
)


@router.post(
    "/plan",
    response_model=(
        EvacuationPlanResponse
    ),
)
def evacuation_plan(
    request: EvacuationPlanRequest,
):
    return create_evacuation_plan(
        request,
    )