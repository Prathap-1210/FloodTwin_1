from fastapi import APIRouter

from app.schemas.routes import (
    RouteRequest,
    SafeRouteResponse,
)

from app.services.routes_service import (
    generate_safe_routes,
)


router = APIRouter(
    prefix="/api/routes",
    tags=["Flood-Safe Routing"],
)


@router.post(
    "/safe",
    response_model=SafeRouteResponse,
)
def safe_route(
    request: RouteRequest,
):
    return generate_safe_routes(
        request,
    )