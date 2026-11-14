from app.schemas.evacuation import (
    CampAllocation,
    EvacuationPlanRequest,
    EvacuationPlanResponse,
)


CAMPS = [
    {
        "camp_id": "CAMP_A",
        "camp_name": "Camp A",
        "capacity": 300,
    },
    {
        "camp_id": "CAMP_B",
        "camp_name": "Camp B",
        "capacity": 200,
    },
]


def create_evacuation_plan(
    request: EvacuationPlanRequest,
) -> EvacuationPlanResponse:

    people_remaining = (
        request.people_at_risk
    )

    assignments: list[
        CampAllocation
    ] = []

    allocated_people = 0

    # ====================================================
    # ALLOCATE PEOPLE TO CAMPS
    # ====================================================

    for camp in CAMPS:

        allocated = min(
            people_remaining,
            camp["capacity"],
        )

        remaining_capacity = (
            camp["capacity"]
            - allocated
        )

        assignments.append(
            CampAllocation(
                camp_id=camp[
                    "camp_id"
                ],

                camp_name=camp[
                    "camp_name"
                ],

                capacity=camp[
                    "capacity"
                ],

                allocated=allocated,

                remaining_capacity=(
                    remaining_capacity
                ),
            )
        )

        allocated_people += (
            allocated
        )

        people_remaining -= (
            allocated
        )

    # ====================================================
    # SUMMARY
    # ====================================================

    total_capacity = sum(
        camp["capacity"]
        for camp in CAMPS
    )

    unallocated_people = max(
        request.people_at_risk
        - allocated_people,
        0,
    )

    if (
        request.people_at_risk
        == 0
    ):
        readiness = 100.0

    else:
        readiness = round(
            (
                allocated_people
                / request.people_at_risk
            )
            * 100,
            1,
        )

    # ====================================================
    # EVACUATION DECISION
    # ====================================================

    evacuation_required = (
        request.risk_level
        in [
            "SEVERE",
            "HIGH",
        ]
        and request.people_at_risk
        > 0
    )

    if not evacuation_required:
        status = (
            "MONITORING_ONLY"
        )

    elif unallocated_people > 0:
        status = (
            "CAPACITY_SHORTFALL"
        )

    else:
        status = (
            "FULLY_ALLOCATED"
        )

    return EvacuationPlanResponse(
        zone_id=request.zone_id,

        evacuation_required=(
            evacuation_required
        ),

        people_at_risk=(
            request.people_at_risk
        ),

        total_capacity=(
            total_capacity
        ),

        allocated_people=(
            allocated_people
        ),

        unallocated_people=(
            unallocated_people
        ),

        evacuation_readiness_percent=(
            readiness
        ),

        assignments=assignments,

        primary_camp=(
            "Camp A"
            if allocated_people > 0
            else None
        ),

        secondary_camp=(
            "Camp B"
            if request.people_at_risk
            > 300
            else None
        ),

        route_strategy=(
            "Use flood-safe routing and "
            "avoid threatened R12 corridor."
        ),

        status=status,

        data_mode="demo",
    )