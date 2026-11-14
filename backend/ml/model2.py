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
    / "model2"
)

MODEL_PATH = (
    MODEL_DIR
    / "model2_status_classifier.pkl"
)

METADATA_PATH = (
    MODEL_DIR
    / "model2_metadata.json"
)


# ============================================================
# MODEL CONTRACT
# ============================================================

FEATURES = [
    "rainfall_mm_hr",
    "c2_diameter_m",
    "capacity_percent",
    "upstream_load_percent",
    "downstream_load_percent",
    "nearby_water_depth_cm",
    "normal_capacity_percent",
]


# ============================================================
# LOADERS
# ============================================================

@lru_cache(maxsize=1)
def load_model():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model 2 not found: {MODEL_PATH}"
        )

    artifact = joblib.load(
        MODEL_PATH
    )

    # Support either:
    # 1. direct sklearn model
    # 2. {"model": trained_model}
    if isinstance(artifact, dict):

        if "model" in artifact:
            return artifact["model"]

        if "classifier" in artifact:
            return artifact["classifier"]

    return artifact


@lru_cache(maxsize=1)
def load_metadata():

    if not METADATA_PATH.exists():
        return {}

    return json.loads(
        METADATA_PATH.read_text(
            encoding="utf-8"
        )
    )


# ============================================================
# VALIDATION
# ============================================================

def validate_input(
    data: dict,
) -> dict:

    missing = [
        feature
        for feature in FEATURES
        if feature not in data
    ]

    if missing:
        raise ValueError(
            f"Missing Model 2 features: {missing}"
        )

    cleaned = {}

    for feature in FEATURES:

        try:
            value = float(
                data[feature]
            )

        except (TypeError, ValueError):
            raise ValueError(
                f"{feature} must be numeric."
            )

        if not math.isfinite(value):
            raise ValueError(
                f"{feature} must be finite."
            )

        cleaned[feature] = value

    # ----------------------------------------------
    # Physical sanity checks
    # ----------------------------------------------

    non_negative = [
        "rainfall_mm_hr",
        "c2_diameter_m",
        "capacity_percent",
        "upstream_load_percent",
        "downstream_load_percent",
        "nearby_water_depth_cm",
        "normal_capacity_percent",
    ]

    for feature in non_negative:

        if cleaned[feature] < 0:
            raise ValueError(
                f"{feature} cannot be negative."
            )

    if cleaned["c2_diameter_m"] == 0:
        raise ValueError(
            "c2_diameter_m must be greater than 0."
        )

    return cleaned


# ============================================================
# OPERATIONAL SEVERITY
# ============================================================

def severity_from_status(
    status: str,
) -> str:

    mapping = {
        "NORMAL": "LOW",
        "STRESSED": "MEDIUM",
        "OVERLOADED": "HIGH",
        "PROBABLE_BLOCKAGE": "CRITICAL",
    }

    return mapping.get(
        status,
        "UNKNOWN",
    )


# ============================================================
# EXPLANATION
# ============================================================

def build_explanation(
    status: str,
    data: dict,
) -> str:

    capacity = data[
        "capacity_percent"
    ]

    upstream = data[
        "upstream_load_percent"
    ]

    downstream = data[
        "downstream_load_percent"
    ]

    depth = data[
        "nearby_water_depth_cm"
    ]

    load_difference = (
        upstream
        -
        downstream
    )

    if status == "PROBABLE_BLOCKAGE":

        return (
            "Hydraulic conditions are consistent with "
            "a probable drainage restriction. "
            f"Capacity load is {capacity:.1f}%, "
            f"upstream-downstream load difference is "
            f"{load_difference:.1f} percentage points, "
            f"and nearby water depth is {depth:.1f} cm. "
            "Physical field verification is required."
        )

    if status == "OVERLOADED":

        return (
            "Drainage demand exceeds or approaches "
            "available hydraulic capacity. "
            f"Current capacity load is {capacity:.1f}%."
        )

    if status == "STRESSED":

        return (
            "Drainage system is under elevated hydraulic "
            "stress but has not reached the overloaded "
            "classification."
        )

    return (
        "Drainage conditions are within the model's "
        "normal operating classification."
    )


# ============================================================
# RECOMMENDED ACTION
# ============================================================

def recommended_action(
    status: str,
) -> str:

    mapping = {

        "NORMAL":
            "Continue routine monitoring.",

        "STRESSED":
            "Increase monitoring of drain load and "
            "nearby water depth.",

        "OVERLOADED":
            "Inspect drainage capacity and prepare "
            "temporary pumping or flow diversion.",

        "PROBABLE_BLOCKAGE":
            "Dispatch field inspection and clear the "
            "suspected restriction if confirmed.",
    }

    return mapping.get(
        status,
        "Inspect drainage condition.",
    )


# ============================================================
# PUBLIC MODEL 2 FUNCTION
# ============================================================

def predict_drainage_status(
    data: dict,
) -> dict:

    cleaned = validate_input(
        data
    )

    model = load_model()

    frame = pd.DataFrame(
        [cleaned],
        columns=FEATURES,
    )

    prediction = model.predict(
        frame
    )

    status = str(
        prediction[0]
    )

    # ========================================================
    # PROBABILITIES
    # ========================================================

    class_probabilities = {}
    confidence = None

    if hasattr(
        model,
        "predict_proba",
    ):

        probabilities = (
            model.predict_proba(
                frame
            )[0]
        )

        classes = [
            str(value)
            for value
            in model.classes_
        ]

        class_probabilities = {
            class_name:
                round(
                    float(probability),
                    4,
                )
            for class_name, probability
            in zip(
                classes,
                probabilities,
            )
        }

        if status in class_probabilities:

            confidence = (
                class_probabilities[
                    status
                ]
            )

    # ========================================================
    # METADATA
    # ========================================================

    metadata = load_metadata()

    # ========================================================
    # OUTPUT
    # ========================================================

    return {

        "model":
            "drainage_anomaly",

        "model_type":
            metadata.get(
                "model_type",
                type(model).__name__,
            ),

        "drain_id":
            data.get(
                "drain_id",
                "UNKNOWN",
            ),

        "status":
            status,

        "confidence":
            (
                round(
                    confidence,
                    4,
                )
                if confidence is not None
                else None
            ),

        "confidence_percent":
            (
                round(
                    confidence * 100,
                    2,
                )
                if confidence is not None
                else None
            ),

        "severity":
            severity_from_status(
                status
            ),

        "class_probabilities":
            class_probabilities,

        "explanation":
            build_explanation(
                status,
                cleaned,
            ),

        "recommended_action":
            recommended_action(
                status
            ),

        "hydraulic_context": {

            "capacity_percent":
                cleaned[
                    "capacity_percent"
                ],

            "load_difference_percent":
                round(
                    cleaned[
                        "upstream_load_percent"
                    ]
                    -
                    cleaned[
                        "downstream_load_percent"
                    ],
                    2,
                ),

            "nearby_water_depth_cm":
                cleaned[
                    "nearby_water_depth_cm"
                ],
        },

        "diagnostic_note":
            (
                "PROBABLE_BLOCKAGE is an ML diagnostic "
                "classification and does not by itself "
                "prove a physical blockage."
            ),
    }