from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    BACKEND_DIR
    / "models"
    / "model5"
)

MODEL_PATH = (
    MODEL_DIR
    / "evacuation_demand_realtime.joblib"
)


# ============================================================
# MODEL CONTRACT
# ============================================================

FEATURE_COLUMNS = [
    "population",
    "flood_depth_cm",
    "flood_probability",
    "water_rise_rate_cm_hr",
    "road_accessibility",
    "distance_to_shelter_km",
    "vulnerability_index",
]


FEATURE_LIMITS = {
    "population": (1, 100000),
    "flood_depth_cm": (0, 500),
    "flood_probability": (0, 1),
    "water_rise_rate_cm_hr": (-100, 200),
    "road_accessibility": (0, 1),
    "distance_to_shelter_km": (0, 100),
    "vulnerability_index": (0, 1),
}


PRIORITY_THRESHOLDS = {
    "MEDIUM": 0.25,
    "HIGH": 0.45,
    "CRITICAL": 0.70,
}


# ============================================================
# LOAD MODEL
# ============================================================

@lru_cache(maxsize=1)
def load_model_package():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model 5 not found: {MODEL_PATH}"
        )

    package = joblib.load(
        MODEL_PATH
    )

    if not isinstance(
        package,
        dict,
    ):
        raise ValueError(
            "Model 5 artifact must be a packaged dictionary."
        )

    if "evacuation_model" not in package:
        raise ValueError(
            "Model 5 package does not contain 'evacuation_model'."
        )

    artifact_features = package.get(
        "feature_names"
    )

    if (
        artifact_features is not None
        and artifact_features != FEATURE_COLUMNS
    ):
        raise ValueError(
            "Model 5 feature schema mismatch."
        )

    return package


# ============================================================
# VALIDATION
# ============================================================

def validate_feature(
    name: str,
    value,
):

    numeric = float(
        value
    )

    minimum, maximum = (
        FEATURE_LIMITS[
            name
        ]
    )

    if not (
        minimum
        <= numeric
        <= maximum
    ):
        raise ValueError(
            f"{name} must be between "
            f"{minimum} and {maximum}."
        )

    return numeric


# ============================================================
# PRIORITY
# ============================================================

def priority_from_ratio(
    ratio: float,
) -> str:

    ratio = float(
        ratio
    )

    if (
        ratio
        >= PRIORITY_THRESHOLDS[
            "CRITICAL"
        ]
    ):
        return "CRITICAL"

    if (
        ratio
        >= PRIORITY_THRESHOLDS[
            "HIGH"
        ]
    ):
        return "HIGH"

    if (
        ratio
        >= PRIORITY_THRESHOLDS[
            "MEDIUM"
        ]
    ):
        return "MEDIUM"

    return "LOW"


# ============================================================
# PUBLIC MODEL 5 FUNCTION
# ============================================================

def predict_evacuation(
    *,
    population,
    flood_depth_cm,
    flood_probability,
    water_rise_rate_cm_hr,
    road_accessibility,
    distance_to_shelter_km,
    vulnerability_index,
):

    package = (
        load_model_package()
    )

    population_value = int(
        round(
            validate_feature(
                "population",
                population,
            )
        )
    )

    row = {
        "population":
            population_value,

        "flood_depth_cm":
            validate_feature(
                "flood_depth_cm",
                flood_depth_cm,
            ),

        "flood_probability":
            validate_feature(
                "flood_probability",
                flood_probability,
            ),

        "water_rise_rate_cm_hr":
            validate_feature(
                "water_rise_rate_cm_hr",
                water_rise_rate_cm_hr,
            ),

        "road_accessibility":
            validate_feature(
                "road_accessibility",
                road_accessibility,
            ),

        "distance_to_shelter_km":
            validate_feature(
                "distance_to_shelter_km",
                distance_to_shelter_km,
            ),

        "vulnerability_index":
            validate_feature(
                "vulnerability_index",
                vulnerability_index,
            ),
    }

    frame = pd.DataFrame(
        [row],
        columns=FEATURE_COLUMNS,
    )

    ratio = float(
        package[
            "evacuation_model"
        ]
        .predict(
            frame
        )[0]
    )

    ratio = max(
        0.0,
        min(
            1.0,
            ratio,
        ),
    )

    evacuation_count = int(
        round(
            population_value
            * ratio
        )
    )

    evacuation_count = min(
        evacuation_count,
        population_value,
    )

    return {
        "model":
            "evacuation_demand",

        "population":
            population_value,

        "predicted_evacuation_count":
            evacuation_count,

        "evacuation_ratio":
            round(
                ratio,
                4,
            ),

        "evacuation_ratio_percent":
            round(
                ratio * 100,
                2,
            ),

        "priority":
            priority_from_ratio(
                ratio
            ),

        "training_mode":
            package.get(
                "training_mode",
                "realtime",
            ),

        "model_source":
            "ml_realtime_hybrid",

        "model_version":
            package.get(
                "version",
                "unknown",
            ),

        "trained_at_utc":
            package.get(
                "trained_at_utc"
            ),
    }