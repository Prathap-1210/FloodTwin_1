from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import math

import joblib
import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    BACKEND_DIR
    / "models"
    / "model4"
)

MODEL_PATH = (
    MODEL_DIR
    / "road_risk_realtime.joblib"
)


# ============================================================
# FEATURE CONTRACT
# ============================================================

FEATURE_COLUMNS = [
    "predicted_flood_depth_cm",
    "rainfall_intensity_mm_hr",
    "drainage_load_percent",
    "hotspot_risk_probability",
    "distance_to_hotspot_m",
    "road_elevation_m",
    "forecast_minutes",
    "road_type",
]


ROAD_ADJUSTMENT = {
    "residential": 0.25,
    "tertiary": 0.10,
    "secondary": 0.00,
    "primary": -0.10,
}


# ============================================================
# LOAD MODEL
# ============================================================

@lru_cache(maxsize=1)
def load_model_package():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model 4 not found: {MODEL_PATH}"
        )

    package = joblib.load(
        MODEL_PATH
    )

    if not isinstance(
        package,
        dict,
    ):
        raise ValueError(
            "Model 4 artifact must be a packaged dictionary."
        )

    if "model" not in package:
        raise ValueError(
            "Model 4 package does not contain 'model'."
        )

    artifact_features = package.get(
        "feature_names"
    )

    if (
        artifact_features is not None
        and artifact_features != FEATURE_COLUMNS
    ):
        raise ValueError(
            "Model 4 feature schema mismatch."
        )

    return package


# ============================================================
# HELPERS
# ============================================================

def clamp(
    value,
    minimum,
    maximum,
):

    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def normalize_road_type(
    value: str,
) -> str:

    road_type = (
        str(value)
        .strip()
        .lower()
    )

    aliases = {
        "living_street": "residential",
        "unclassified": "residential",
        "service": "residential",
        "track": "residential",
        "trunk": "primary",
        "motorway": "primary",
    }

    road_type = aliases.get(
        road_type,
        road_type,
    )

    if road_type not in ROAD_ADJUSTMENT:
        road_type = "residential"

    return road_type


def risk_class_from_probability(
    probability: float,
) -> str:

    probability = float(
        probability
    )

    if probability >= 0.70:
        return "UNSAFE"

    if probability >= 0.40:
        return "CAUTION"

    return "SAFE"


# ============================================================
# REASONS
# ============================================================

def reasons_from_input(
    data: dict,
) -> list[str]:

    reasons = []

    depth = float(
        data[
            "predicted_flood_depth_cm"
        ]
    )

    rain = float(
        data[
            "rainfall_intensity_mm_hr"
        ]
    )

    drainage = float(
        data[
            "drainage_load_percent"
        ]
    )

    hotspot = float(
        data[
            "hotspot_risk_probability"
        ]
    )

    distance = float(
        data[
            "distance_to_hotspot_m"
        ]
    )

    elevation = float(
        data[
            "road_elevation_m"
        ]
    )

    if depth >= 40:

        reasons.append(
            "high predicted road flood depth"
        )

    elif depth >= 20:

        reasons.append(
            "moderate predicted road flood depth"
        )

    if rain >= 60:

        reasons.append(
            "very heavy rainfall"
        )

    elif rain >= 25:

        reasons.append(
            "high rainfall intensity"
        )

    if drainage >= 100:

        reasons.append(
            "nearby drainage overloaded"
        )

    elif drainage >= 80:

        reasons.append(
            "nearby drainage stressed"
        )

    if hotspot >= 0.70:

        reasons.append(
            "high hotspot probability"
        )

    if distance <= 150:

        reasons.append(
            "very close to flood hotspot"
        )

    elif distance <= 400:

        reasons.append(
            "close to flood hotspot"
        )

    if elevation <= 4:

        reasons.append(
            "low-lying road elevation"
        )

    if not reasons:

        reasons.append(
            "low combined flood-road indicators"
        )

    return reasons[:5]


# ============================================================
# VALIDATION
# ============================================================

def validate_input(
    *,
    predicted_flood_depth_cm,
    rainfall_intensity_mm_hr,
    drainage_load_percent,
    hotspot_risk_probability,
    distance_to_hotspot_m,
    road_elevation_m,
    road_type,
    forecast_minutes,
):

    row = {
        "predicted_flood_depth_cm":
            float(
                predicted_flood_depth_cm
            ),

        "rainfall_intensity_mm_hr":
            float(
                rainfall_intensity_mm_hr
            ),

        "drainage_load_percent":
            float(
                drainage_load_percent
            ),

        "hotspot_risk_probability":
            float(
                hotspot_risk_probability
            ),

        "distance_to_hotspot_m":
            float(
                distance_to_hotspot_m
            ),

        "road_elevation_m":
            float(
                road_elevation_m
            ),

        "road_type":
            normalize_road_type(
                road_type
            ),

        "forecast_minutes":
            float(
                forecast_minutes
            ),
    }

    numeric_values = [
        row[feature]
        for feature
        in FEATURE_COLUMNS
        if feature != "road_type"
    ]

    if not all(
        np.isfinite(
            numeric_values
        )
    ):
        raise ValueError(
            "All Model 4 numeric features must be finite."
        )

    if not (
        0.0
        <= row[
            "hotspot_risk_probability"
        ]
        <= 1.0
    ):
        raise ValueError(
            "hotspot_risk_probability must be between 0 and 1."
        )

    if (
        row[
            "distance_to_hotspot_m"
        ]
        < 0
    ):
        raise ValueError(
            "distance_to_hotspot_m cannot be negative."
        )

    return row


# ============================================================
# PUBLIC MODEL 4 FUNCTION
# ============================================================

def predict_road_risk(
    *,
    predicted_flood_depth_cm,
    rainfall_intensity_mm_hr,
    drainage_load_percent,
    hotspot_risk_probability,
    distance_to_hotspot_m,
    road_elevation_m,
    road_type,
    forecast_minutes,
):

    row = validate_input(
        predicted_flood_depth_cm=
            predicted_flood_depth_cm,

        rainfall_intensity_mm_hr=
            rainfall_intensity_mm_hr,

        drainage_load_percent=
            drainage_load_percent,

        hotspot_risk_probability=
            hotspot_risk_probability,

        distance_to_hotspot_m=
            distance_to_hotspot_m,

        road_elevation_m=
            road_elevation_m,

        road_type=
            road_type,

        forecast_minutes=
            forecast_minutes,
    )

    package = (
        load_model_package()
    )

    model = package[
        "model"
    ]

    frame = pd.DataFrame(
        [row],
        columns=FEATURE_COLUMNS,
    )

    probability = float(
        model.predict_proba(
            frame
        )[0, 1]
    )

    probability = float(
        np.clip(
            probability,
            0.0,
            1.0,
        )
    )

    risk_class = (
        risk_class_from_probability(
            probability
        )
    )

    if risk_class == "UNSAFE":

        routing_recommendation = (
            "EXCLUDE_OR_HEAVY_PENALTY"
        )

    elif risk_class == "CAUTION":

        routing_recommendation = (
            "MODERATE_PENALTY"
        )

    else:

        routing_recommendation = (
            "NORMAL"
        )

    return {

        "model":
            "road_risk",

        "road_risk_probability":
            round(
                probability,
                4,
            ),

        "risk_class":
            risk_class,

        "unsafe":
            risk_class
            == "UNSAFE",

        "routing_recommendation":
            routing_recommendation,

        "reasons":
            reasons_from_input(
                row
            ),

        "forecast_minutes":
            int(
                round(
                    row[
                        "forecast_minutes"
                    ]
                )
            ),

        "road_type":
            row[
                "road_type"
            ],

        "training_mode":
            package.get(
                "training_mode",
                "realtime",
            ),

        "model_source":
            "ml_realtime_hybrid",

        "model_version":
            package.get(
                "model_version",
                "unknown",
            ),

        "trained_at_utc":
            package.get(
                "trained_at_utc"
            ),

        "thresholds": {
            "safe_below": 0.40,
            "caution_from": 0.40,
            "unsafe_from": 0.70,
        },
    }