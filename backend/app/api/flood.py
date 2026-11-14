from fastapi import APIRouter

from app.schemas.flood import (
    FloodPredictionRequest,
    FloodPredictionResponse,
)

from app.services.flood_service import (
    predict_flood,
)


router = APIRouter(
    prefix="/api/flood",
    tags=["Flood Prediction"],
)


@router.post(
    "/predict",
    response_model=FloodPredictionResponse,
)
def flood_prediction(
    request: FloodPredictionRequest,
):
    return predict_flood(
        request,
    )