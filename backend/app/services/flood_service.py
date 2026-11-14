from app.schemas.flood import (
    FloodPredictionRequest,
    FloodPredictionResponse,
)


DEMO_FORECASTS = {
    0: {
        "depth_cm": 8,
        "probability": 0.32,
        "risk": "CAUTION",
        "people_at_risk": 80,
        "drain_status": "STRESSED",
        "drain_load_percent": 68,
        "anomaly_probability": 0.21,
        "drain_priority": "P4",
        "confidence": 0.78,
        "polygon": [
            [
                [80.221, 12.9815],
                [80.223, 12.981],
                [80.2242, 12.982],
                [80.2234, 12.9832],
                [80.2214, 12.983],
                [80.221, 12.9815],
            ]
        ],
    },

    30: {
        "depth_cm": 21,
        "probability": 0.61,
        "risk": "HIGH",
        "people_at_risk": 220,
        "drain_status": "STRESSED",
        "drain_load_percent": 84,
        "anomaly_probability": 0.42,
        "drain_priority": "P3",
        "confidence": 0.82,
        "polygon": [
            [
                [80.2202, 12.9808],
                [80.223, 12.98],
                [80.225, 12.981],
                [80.2253, 12.9833],
                [80.2233, 12.9843],
                [80.2207, 12.9835],
                [80.2202, 12.9808],
            ]
        ],
    },

    60: {
        "depth_cm": 42,
        "probability": 0.88,
        "risk": "SEVERE",
        "people_at_risk": 500,
        "drain_status": "PROBABLE_BLOCKAGE",
        "drain_load_percent": 106,
        "anomaly_probability": 0.87,
        "drain_priority": "P1",
        "confidence": 0.91,
        "polygon": [
            [
                [80.2188, 12.98],
                [80.2222, 12.979],
                [80.2255, 12.9803],
                [80.2264, 12.9835],
                [80.2238, 12.9855],
                [80.2201, 12.9847],
                [80.2188, 12.98],
            ]
        ],
    },

    90: {
        "depth_cm": 58,
        "probability": 0.94,
        "risk": "SEVERE",
        "people_at_risk": 720,
        "drain_status": "PROBABLE_BLOCKAGE",
        "drain_load_percent": 121,
        "anomaly_probability": 0.93,
        "drain_priority": "P1",
        "confidence": 0.93,
        "polygon": [
            [
                [80.2178, 12.979],
                [80.2215, 12.9778],
                [80.226, 12.9792],
                [80.2275, 12.9837],
                [80.2245, 12.9863],
                [80.219, 12.9853],
                [80.2178, 12.979],
            ]
        ],
    },

    180: {
        "depth_cm": 34,
        "probability": 0.73,
        "risk": "HIGH",
        "people_at_risk": 410,
        "drain_status": "OVERLOADED",
        "drain_load_percent": 94,
        "anomaly_probability": 0.69,
        "drain_priority": "P2",
        "confidence": 0.87,
        "polygon": [
            [
                [80.2194, 12.98],
                [80.2224, 12.9793],
                [80.2256, 12.9805],
                [80.226, 12.9836],
                [80.2234, 12.985],
                [80.22, 12.984],
                [80.2194, 12.98],
            ]
        ],
    },
}


def predict_flood(
    request: FloodPredictionRequest,
) -> FloodPredictionResponse:

    forecast = DEMO_FORECASTS[
        request.forecast_minutes
    ]

    return FloodPredictionResponse(
        zone_id=request.zone_id,

        forecast_minutes=request.forecast_minutes,

        depth_cm=forecast["depth_cm"],

        probability=forecast["probability"],

        risk=forecast["risk"],

        people_at_risk=forecast[
            "people_at_risk"
        ],

        drain_status=forecast[
            "drain_status"
        ],

        drain_load_percent=forecast[
            "drain_load_percent"
        ],

        anomaly_probability=forecast[
            "anomaly_probability"
        ],

        drain_priority=forecast[
            "drain_priority"
        ],

        confidence=forecast[
            "confidence"
        ],

        polygon=forecast[
            "polygon"
        ],

        data_mode="demo",
    )