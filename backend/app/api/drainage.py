from fastapi import APIRouter

from app.schemas.drainage import (
    DrainageAnalysisRequest,
    DrainageAnalysisResponse,
)

from app.services.drainage_service import (
    analyze_drainage,
)


router = APIRouter(
    prefix="/api/drainage",
    tags=["Drainage Intelligence"],
)


@router.post(
    "/analyze",
    response_model=DrainageAnalysisResponse,
)
def drainage_analysis(
    request: DrainageAnalysisRequest,
):
    return analyze_drainage(
        request,
    )