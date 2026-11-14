from app.schemas.response import (
    ResponseAction,
    ResponseRecommendationRequest,
    ResponseRecommendationResponse,
)


def recommend_response(
    request: ResponseRecommendationRequest,
) -> ResponseRecommendationResponse:

    actions: list[ResponseAction] = []

    # ====================================================
    # DRAINAGE ACTION
    # ====================================================

    if (
        request.drain_load_percent >= 100
        or request.anomaly_probability >= 0.75
        or request.drain_status
        == "PROBABLE_BLOCKAGE"
    ):
        actions.append(
            ResponseAction(
                action_id="ACT_D17_CLEAR",

                priority="P1",

                category="DRAINAGE",

                title="Inspect and Clear Drain D17",

                target=request.drain_id,

                reason=(
                    "High drain load and anomaly "
                    "probability indicate probable "
                    "local obstruction."
                ),

                recommended=True,
            )
        )

    # ====================================================
    # PUMP ACTION
    # ====================================================

    if (
        request.flood_depth_cm >= 35
        or request.drain_load_percent >= 100
    ):
        actions.append(
            ResponseAction(
                action_id="ACT_PUMP_P2",

                priority="P1",

                category="PUMPING",

                title="Deploy Pump P2",

                target="P2",

                reason=(
                    "Temporary pumping can support "
                    "local dewatering while drainage "
                    "capacity remains constrained."
                ),

                recommended=True,
            )
        )

    # ====================================================
    # ROAD ACTION
    # ====================================================

    if (
        request.flood_depth_cm >= 35
        or request.flood_probability >= 0.80
    ):
        actions.append(
            ResponseAction(
                action_id="ACT_R12_CLOSE",

                priority="P1",

                category="ROAD_CONTROL",

                title="Close Road R12",

                target=request.road_id,

                reason=(
                    "Forecast flood depth and "
                    "probability make the corridor "
                    "unsafe for normal traffic."
                ),

                recommended=True,
            )
        )

    # ====================================================
    # EVACUATION ACTION
    # ====================================================

    if (
        request.evacuation_required
        or request.people_at_risk >= 500
    ):
        actions.append(
            ResponseAction(
                action_id="ACT_Z003_EVAC",

                priority="P1",

                category="EVACUATION",

                title="Evacuate Zone Z003",

                target=request.zone_id,

                reason=(
                    f"{request.people_at_risk} people "
                    "are exposed and should be moved "
                    "toward allocated shelters using "
                    "the flood-safe route."
                ),

                recommended=True,
            )
        )

    # ====================================================
    # INCIDENT LEVEL
    # ====================================================

    if (
        request.flood_depth_cm >= 40
        and request.flood_probability >= 0.80
    ):
        incident_level = "SEVERE"

    elif (
        request.flood_depth_cm >= 25
        or request.flood_probability >= 0.60
    ):
        incident_level = "HIGH"

    else:
        incident_level = "CAUTION"

    p1_actions = sum(
        1
        for action in actions
        if action.priority == "P1"
    )

    return ResponseRecommendationResponse(
        zone_id=request.zone_id,

        incident_level=incident_level,

        actions=actions,

        total_actions=len(actions),

        p1_actions=p1_actions,

        immediate_action_required=(
            p1_actions > 0
        ),

        decision_summary=(
            "FloodTwin recommends immediate "
            "drainage clearance, pumping support, "
            "road control and evacuation to reduce "
            "flood exposure in Z003."
        ),

        data_mode="demo",
    )

from app.schemas.response import (
    ResponseSimulationRequest,
    ResponseSimulationResponse,
    ScenarioState,
)


def simulate_response(
    request: ResponseSimulationRequest,
) -> ResponseSimulationResponse:

    before_depth = request.flood_depth_cm

    before_people = request.people_at_risk

    before_drain = request.drain_load_percent

    before_anomaly = (
        request.anomaly_probability
    )

    after_depth = before_depth

    after_people = before_people

    after_drain = before_drain

    after_anomaly = before_anomaly

    selected_actions = 0

    # ====================================================
    # CLEAR D17
    # ====================================================

    if (
        request.interventions.clear_drain_d17
    ):
        selected_actions += 1

        after_depth -= 7

        after_drain -= 17

        after_anomaly -= 0.38

    # ====================================================
    # DEPLOY PUMP P2
    # ====================================================

    if (
        request.interventions.deploy_pump_p2
    ):
        selected_actions += 1

        after_depth -= 11

        after_drain -= 7

        after_people -= 70

    # ====================================================
    # CLOSE R12
    # ====================================================

    if (
        request.interventions.close_road_r12
    ):
        selected_actions += 1

        road_status = "CONTROLLED_CLOSED"

    else:
        road_status = "UNSAFE"

    # ====================================================
    # EVACUATE Z003
    # ====================================================

    if (
        request.interventions.evacuate_z003
    ):
        selected_actions += 1

        evacuation_reduction = min(
            310,
            after_people,
        )

        after_people -= (
            evacuation_reduction
        )

    # ====================================================
    # HOSPITAL ACCESS
    # ====================================================

    if (
        request.interventions.close_road_r12
        and request.interventions.evacuate_z003
    ):
        hospital_access = (
            "PRIORITY_ACCESS"
        )

    else:
        hospital_access = (
            "AFFECTED"
        )

    # ====================================================
    # SAFETY LIMITS
    # ====================================================

    after_depth = max(
        round(after_depth, 1),
        0,
    )

    after_people = max(
        after_people,
        0,
    )

    after_drain = max(
        round(after_drain, 1),
        0,
    )

    after_anomaly = max(
        round(after_anomaly, 2),
        0,
    )

    # ====================================================
    # BEFORE
    # ====================================================

    before = ScenarioState(
        flood_depth_cm=before_depth,

        people_exposed=before_people,

        drain_load_percent=before_drain,

        anomaly_probability=before_anomaly,

        road_status="UNSAFE",

        hospital_access="AFFECTED",
    )

    # ====================================================
    # AFTER
    # ====================================================

    after = ScenarioState(
        flood_depth_cm=after_depth,

        people_exposed=after_people,

        drain_load_percent=after_drain,

        anomaly_probability=after_anomaly,

        road_status=road_status,

        hospital_access=hospital_access,
    )

    return ResponseSimulationResponse(
        zone_id=request.zone_id,

        before=before,

        after=after,

        depth_reduction_cm=round(
            before_depth - after_depth,
            1,
        ),

        exposure_reduction=(
            before_people - after_people
        ),

        drain_load_reduction_percent=round(
            before_drain - after_drain,
            1,
        ),

        selected_actions=selected_actions,

        simulation_status="COMPLETED",

        data_mode="demo",
    )