from __future__ import annotations

import json
import math
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
    / "model1"
)

MODEL_PATH = (
    MODEL_DIR
    / "flood_depth_model.joblib"
)

METADATA_PATH = (
    MODEL_DIR
    / "metadata.json"
)

FEATURE_SCHEMA_PATH = (
    MODEL_DIR
    / "feature_schema.json"
)

UNCERTAINTY_PATH = (
    MODEL_DIR
    / "uncertainty.json"
)


# ============================================================
# MODEL CONTRACT
# ============================================================

FEATURES = [
    "rainfall_mm_hr",
    "recent_rainfall_mm",
    "antecedent_rainfall_mm",
    "elevation_m",
    "slope_deg",
    "built_up_percent",
    "distance_to_nearest_drain_m",
    "drain_density_m_per_km2",
    "previous_depth_cm",
    "forecast_minutes",
]

FORECAST_HORIZONS = [
    30,
    60,
    90,
    180,
]

RISK_THRESHOLDS_CM = {
    "SAFE_MAX": 5.0,
    "CAUTION_MAX": 20.0,
    "HIGH_MAX": 40.0,
}


# ============================================================
# LOADERS
# ============================================================

@lru_cache(maxsize=1)
def load_model():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model 1 not found: {MODEL_PATH}"
        )

    return joblib.load(
        MODEL_PATH
    )


@lru_cache(maxsize=1)
def load_metadata():

    if not METADATA_PATH.exists():
        return {}

    return json.loads(
        METADATA_PATH.read_text(
            encoding="utf-8"
        )
    )


@lru_cache(maxsize=1)
def load_schema():

    if not FEATURE_SCHEMA_PATH.exists():
        return {}

    return json.loads(
        FEATURE_SCHEMA_PATH.read_text(
            encoding="utf-8"
        )
    )


@lru_cache(maxsize=1)
def load_uncertainty():

    if not UNCERTAINTY_PATH.exists():
        return {}

    return json.loads(
        UNCERTAINTY_PATH.read_text(
            encoding="utf-8"
        )
    )


# ============================================================
# HELPERS
# ============================================================

def classify_risk(
    depth_cm: float,
) -> str:

    if depth_cm < RISK_THRESHOLDS_CM["SAFE_MAX"]:
        return "SAFE"

    if depth_cm < RISK_THRESHOLDS_CM["CAUTION_MAX"]:
        return "CAUTION"

    if depth_cm < RISK_THRESHOLDS_CM["HIGH_MAX"]:
        return "HIGH"

    return "SEVERE"


def flood_probability_from_depth(
    depth_cm: float,
) -> float:

    probability = (
        1
        /
        (
            1
            +
            math.exp(
                -(depth_cm - 18)
                / 8
            )
        )
    )

    return round(
        float(probability),
        4,
    )


# ============================================================
# VALIDATION
# ============================================================

def validate_payload(
    payload: dict,
    forecast_minutes: int,
):

    row = dict(
        payload
    )

    row["forecast_minutes"] = int(
        forecast_minutes
    )

    missing = [
        feature
        for feature in FEATURES
        if feature not in row
    ]

    if missing:
        raise ValueError(
            f"Missing Model 1 features: {missing}"
        )

    schema = (
        load_schema()
        .get(
            "features",
            {}
        )
    )

    cleaned = {}
    warnings = []

    for feature in FEATURES:

        value = float(
            row[feature]
        )

        if not math.isfinite(
            value
        ):
            raise ValueError(
                f"{feature} must be finite."
            )

        rule = schema.get(
            feature,
            {}
        )

        if "allowed" in rule:

            allowed = rule["allowed"]

            if int(value) not in allowed:
                raise ValueError(
                    f"{feature} must be one of "
                    f"{allowed}"
                )

        if "range" in rule:

            minimum, maximum = (
                rule["range"]
            )

            if (
                value < minimum
                or
                value > maximum
            ):

                warnings.append(
                    f"{feature}={value} outside "
                    f"expected range "
                    f"[{minimum}, {maximum}]"
                )

        if feature == "forecast_minutes":

            cleaned[feature] = int(
                value
            )

        else:

            cleaned[feature] = value

    return cleaned, warnings


# ============================================================
# ONE FORECAST
# ============================================================

def predict_one(
    payload: dict,
    forecast_minutes: int,
):

    row, warnings = validate_payload(
        payload,
        forecast_minutes,
    )

    frame = pd.DataFrame(
        [row],
        columns=FEATURES,
    )

    prediction = (
        load_model()
        .predict(
            frame
        )[0]
    )

    predicted_depth_cm = max(
        0.0,
        float(prediction),
    )

    uncertainty = (
        load_uncertainty()
    )

    return {
        "forecast_minutes":
            int(forecast_minutes),

        "predicted_depth_cm":
            round(
                predicted_depth_cm,
                2,
            ),

        "risk":
            classify_risk(
                predicted_depth_cm
            ),

        "flood_probability":
            flood_probability_from_depth(
                predicted_depth_cm
            ),

        "probability_method":
            "depth_derived_proxy",

        "uncertainty_p90_cm":
            uncertainty.get(
                "p90_absolute_error_cm"
            ),

        "warnings":
            warnings,
    }


# ============================================================
# PUBLIC MODEL 1 FUNCTION
# ============================================================

def predict_flood(
    payload: dict,
    horizons: list[int] | None = None,
):

    selected_horizons = (
        horizons
        if horizons is not None
        else FORECAST_HORIZONS
    )

    metadata = (
        load_metadata()
    )

    predictions = [
        predict_one(
            payload,
            horizon,
        )
        for horizon
        in selected_horizons
    ]

    return {
        "model":
            "flood_prediction",

        "model_version":
            metadata.get(
                "model_version",
                "unknown",
            ),

        "model_source":
            "ML_MODEL",

        "zone_id":
            payload.get(
                "zone_id"
            ),

        "predictions":
            predictions,

        "claim_note":
            metadata.get(
                "claim_note"
            ),
    }