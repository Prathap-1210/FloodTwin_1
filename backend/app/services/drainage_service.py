from app.schemas.drainage import (
    DrainageAnalysisRequest,
    DrainageAnalysisResponse,
)


DEMO_DRAINAGE = {
    0: {
        "status": "STRESSED",
        "load_percent": 68,
        "anomaly_probability": 0.21,
        "priority": "P4",
        "confidence": 0.78,
        "likely_cause": (
            "Elevated runoff entering the drainage "
            "segment; no strong blockage signature."
        ),
        "recommended_action": (
            "Continue monitoring D17 and verify "
            "upstream inflow conditions."
        ),
    },

    30: {
        "status": "STRESSED",
        "load_percent": 84,
        "anomaly_probability": 0.42,
        "priority": "P3",
        "confidence": 0.82,
        "likely_cause": (
            "Increasing hydraulic stress caused by "
            "rainfall-driven runoff accumulation."
        ),
        "recommended_action": (
            "Inspect D17 and prepare field teams "
            "for possible obstruction clearance."
        ),
    },

    60: {
        "status": "PROBABLE_BLOCKAGE",
        "load_percent": 106,
        "anomaly_probability": 0.87,
        "priority": "P1",
        "confidence": 0.91,
        "likely_cause": (
            "Probable local obstruction or reduced "
            "conveyance capacity near drainage segment D17."
        ),
        "recommended_action": (
            "Immediately inspect D17, verify the "
            "suspected obstruction and initiate "
            "clearance if confirmed."
        ),
    },

    90: {
        "status": "PROBABLE_BLOCKAGE",
        "load_percent": 121,
        "anomaly_probability": 0.93,
        "priority": "P1",
        "confidence": 0.93,
        "likely_cause": (
            "Severe drainage overload combined with "
            "a high-confidence obstruction signature."
        ),
        "recommended_action": (
            "Prioritize emergency clearance of D17 "
            "and deploy temporary pumping support."
        ),
    },

    180: {
        "status": "OVERLOADED",
        "load_percent": 94,
        "anomaly_probability": 0.69,
        "priority": "P2",
        "confidence": 0.87,
        "likely_cause": (
            "Drainage capacity remains constrained "
            "after peak rainfall conditions."
        ),
        "recommended_action": (
            "Continue drainage inspection and maintain "
            "temporary pumping until load decreases."
        ),
    },
}


def analyze_drainage(
    request: DrainageAnalysisRequest,
) -> DrainageAnalysisResponse:

    result = DEMO_DRAINAGE[
        request.forecast_minutes
    ]

    return DrainageAnalysisResponse(
        drain_id=request.drain_id,

        forecast_minutes=request.forecast_minutes,

        status=result["status"],

        load_percent=result[
            "load_percent"
        ],

        anomaly_probability=result[
            "anomaly_probability"
        ],

        priority=result[
            "priority"
        ],

        confidence=result[
            "confidence"
        ],

        likely_cause=result[
            "likely_cause"
        ],

        recommended_action=result[
            "recommended_action"
        ],

        data_mode="demo",
    )