from app.schemas.risk import (
    RiskClassificationRequest,
    RiskClassificationResponse,
)


def classify_risk(
    request: RiskClassificationRequest,
) -> RiskClassificationResponse:

    score = 0.0

    # Flood depth contribution
    score += min(
        request.flood_depth_cm / 60,
        1.0,
    ) * 35

    # Flood probability contribution
    score += (
        request.flood_probability
        * 25
    )

    # Population exposure contribution
    score += min(
        request.people_at_risk / 700,
        1.0,
    ) * 20

    # Drain overload contribution
    score += min(
        request.drain_load_percent / 120,
        1.0,
    ) * 10

    # Drain anomaly contribution
    score += (
        request.anomaly_probability
        * 10
    )

    score = round(
        min(score, 100),
        1,
    )

    # ---------------------------------------------------
    # CLASSIFICATION
    # ---------------------------------------------------

    if score >= 75:
        risk_level = "SEVERE"
        priority = "P1"

    elif score >= 55:
        risk_level = "HIGH"
        priority = "P2"

    elif score >= 30:
        risk_level = "CAUTION"
        priority = "P3"

    else:
        risk_level = "SAFE"
        priority = "P4"

    evacuation_required = (
        risk_level == "SEVERE"
        or request.people_at_risk >= 500
    )

    road_restriction_required = (
        request.flood_depth_cm >= 35
        or risk_level == "SEVERE"
    )

    drainage_intervention_required = (
        request.drain_load_percent >= 100
        or request.anomaly_probability >= 0.75
    )

    reason = (
        f"Zone {request.zone_id} classified as "
        f"{risk_level} due to flood depth "
        f"{request.flood_depth_cm} cm, flood probability "
        f"{request.flood_probability:.2f}, "
        f"{request.people_at_risk} people exposed and "
        f"drain load {request.drain_load_percent}%."
    )

    return RiskClassificationResponse(
        zone_id=request.zone_id,

        risk_level=risk_level,

        priority=priority,

        risk_score=score,

        evacuation_required=evacuation_required,

        road_restriction_required=road_restriction_required,

        drainage_intervention_required=(
            drainage_intervention_required
        ),

        reason=reason,

        data_mode="demo",
    )