from fastapi import APIRouter

from app.schemas.response import (
    ResponseRecommendationRequest,
    ResponseRecommendationResponse,
    ResponseSimulationRequest,
    ResponseSimulationResponse,
)

from app.services.response_service import (
    recommend_response,
    simulate_response,
)


router = APIRouter(
    prefix="/api/response",
    tags=["Response Intelligence"],
)


@router.post(
    "/recommend",
    response_model=ResponseRecommendationResponse,
)
def response_recommendation(
    request: ResponseRecommendationRequest,
):
    return recommend_response(
        request,
    )


@router.post(
    "/simulate",
    response_model=ResponseSimulationResponse,
)
def response_simulation(
    request: ResponseSimulationRequest,
):
    return simulate_response(
        request,
    )