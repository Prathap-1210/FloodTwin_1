from fastapi import APIRouter

from app.schemas.risk import (
    RiskClassificationRequest,
    RiskClassificationResponse,
)

from app.services.risk_service import (
    classify_risk,
)


router = APIRouter(
    prefix="/api/risk",
    tags=["Risk Classification"],
)


@router.post(
    "/classify",
    response_model=RiskClassificationResponse,
)
def risk_classification(
    request: RiskClassificationRequest,
):
    return classify_risk(
        request,
    )