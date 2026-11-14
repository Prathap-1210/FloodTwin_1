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
    / "model3"
)

MODEL_PATH = (
    MODEL_DIR
    / "hotspot_priority_realtime.joblib"
)


# ============================================================
# MODEL CONTRACT
# ============================================================

NUMERIC_FEATURES = [
    "predicted_depth_cm",
    "flood_probability",
    "people_at_risk",
    "hospital_nearby",
    "major_road_affected",
    "vulnerable_count",
]

CATEGORICAL_FEATURES = [
    "water_level_trend",
]

FEATURE_COLUMNS = (
    NUMERIC_FEATURES
    +
    CATEGORICAL_FEATURES
)

RISK_CLASSES = [
    "SAFE",
    "CAUTION",
    "HIGH",
    "SEVERE",
]

FEATURE_LIMITS = {
    "predicted_depth_cm":
        (0.0, 500.0),

    "flood_probability":
        (0.0, 1.0),

    "people_at_risk":
        (0, 100000),

    "hospital_nearby":
        (0, 1),

    "major_road_affected":
        (0, 1),

    "vulnerable_count":
        (0, 100000),
}


SEVERITY_WEIGHT = {
    "SAFE": 0.10,
    "CAUTION": 0.35,
    "HIGH": 0.65,
    "SEVERE": 0.95,
}


SEVERITY_RANK = {
    "SAFE": 0,
    "CAUTION": 1,
    "HIGH": 2,
    "SEVERE": 3,
}


# ============================================================
# LOAD MODEL
# ============================================================

@lru_cache(maxsize=1)
def load_model_package():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Model 3 not found: {MODEL_PATH}"
        )

    package = joblib.load(
        MODEL_PATH
    )

    if not isinstance(
        package,
        dict,
    ):

        raise ValueError(
            "Model 3 artifact must be "
            "a packaged dictionary."
        )

    if "risk_model" not in package:

        raise ValueError(
            "Model 3 package does not "
            "contain 'risk_model'."
        )

    artifact_features = (
        package.get(
            "feature_names"
        )
    )

    if (
        artifact_features is not None
        and
        artifact_features
        !=
        FEATURE_COLUMNS
    ):

        raise ValueError(
            "Model 3 feature schema "
            "does not match backend adapter."
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


def normalize_trend(
    value: str,
) -> str:

    trend = (
        str(value)
        .strip()
        .upper()
    )

    aliases = {
        "UP": "RISING",
        "INCREASING": "RISING",
        "RISE": "RISING",

        "DOWN": "FALLING",
        "DECREASING": "FALLING",
        "FALL": "FALLING",

        "STEADY": "STABLE",
        "UNCHANGED": "STABLE",
    }

    trend = aliases.get(
        trend,
        trend,
    )

    if trend not in {
        "FALLING",
        "STABLE",
        "RISING",
    }:

        raise ValueError(
            "water_level_trend must be "
            "FALLING, STABLE, or RISING."
        )

    return trend


def validate_numeric(
    name: str,
    value,
):

    try:

        numeric = float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):

        raise ValueError(
            f"{name} must be numeric."
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


def higher_risk(
    first: str,
    second: str,
) -> str:

    if (
        SEVERITY_RANK[
            second
        ]
        >
        SEVERITY_RANK[
            first
        ]
    ):

        return second

    return first


# ============================================================
# POLICY PRIORITY SCORE
# ============================================================

def policy_priority_score(
    *,
    predicted_depth_cm,
    flood_probability,
    people_at_risk,
    hospital_nearby,
    major_road_affected,
    water_level_trend,
    vulnerable_count=0,
):

    depth_score = clamp(
        float(
            predicted_depth_cm
        )
        / 100.0,
        0.0,
        1.0,
    )

    probability_score = clamp(
        float(
            flood_probability
        ),
        0.0,
        1.0,
    )

    population_score = clamp(
        float(
            people_at_risk
        )
        / 1000.0,
        0.0,
        1.0,
    )

    vulnerable_score = clamp(
        float(
            vulnerable_count
        )
        / 400.0,
        0.0,
        1.0,
    )

    hospital_score = (
        1.0
        if bool(
            hospital_nearby
        )
        else 0.0
    )

    road_score = (
        1.0
        if bool(
            major_road_affected
        )
        else 0.0
    )

    trend = normalize_trend(
        water_level_trend
    )

    trend_score = {
        "FALLING": 0.0,
        "STABLE": 0.45,
        "RISING": 1.0,
    }[trend]

    score = 100.0 * (

        0.27
        * depth_score

        +
        0.20
        * probability_score

        +
        0.17
        * population_score

        +
        0.12
        * hospital_score

        +
        0.10
        * road_score

        +
        0.09
        * trend_score

        +
        0.05
        * vulnerable_score
    )

    # ========================================================
    # OPERATIONAL SAFETY OVERRIDES
    # ========================================================

    if (
        predicted_depth_cm >= 60
        and
        flood_probability >= 0.80
        and
        people_at_risk >= 400
    ):

        score = max(
            score,
            78.0,
        )

    if (
        bool(
            hospital_nearby
        )
        and
        bool(
            major_road_affected
        )
        and
        trend == "RISING"
        and
        flood_probability >= 0.75
    ):

        score = max(
            score,
            82.0,
        )

    if (
        predicted_depth_cm >= 100
        or
        people_at_risk >= 2000
    ):

        score = max(
            score,
            86.0,
        )

    return round(
        clamp(
            score,
            0.0,
            100.0,
        ),
        2,
    )


# ============================================================
# POLICY RISK
# ============================================================

def risk_from_score(
    score: float,
) -> str:

    score = float(
        score
    )

    if score >= 75:
        return "SEVERE"

    if score >= 50:
        return "HIGH"

    if score >= 25:
        return "CAUTION"

    return "SAFE"


# ============================================================
# RESPONSE PRIORITY
# ============================================================

def response_priority_from_risk(
    risk: str,
) -> str:

    mapping = {
        "SEVERE": "P1",
        "HIGH": "P2",
        "CAUTION": "P3",
        "SAFE": "P4",
    }

    normalized = (
        str(risk)
        .strip()
        .upper()
    )

    if normalized not in mapping:

        raise ValueError(
            f"Unknown risk class: "
            f"{risk}"
        )

    return mapping[
        normalized
    ]


# ============================================================
# EXPLANATION REASONS
# ============================================================

def reasons_from_input(
    data: dict,
):

    reasons = []

    depth = float(
        data[
            "predicted_depth_cm"
        ]
    )

    probability = float(
        data[
            "flood_probability"
        ]
    )

    people = int(
        round(
            float(
                data[
                    "people_at_risk"
                ]
            )
        )
    )

    hospital = bool(
        data[
            "hospital_nearby"
        ]
    )

    road = bool(
        data[
            "major_road_affected"
        ]
    )

    trend = normalize_trend(
        data[
            "water_level_trend"
        ]
    )

    vulnerable = int(
        round(
            float(
                data.get(
                    "vulnerable_count",
                    0,
                )
            )
        )
    )

    if depth >= 60:

        reasons.append(
            "very high predicted flood depth"
        )

    elif depth >= 30:

        reasons.append(
            "high predicted flood depth"
        )

    elif depth >= 15:

        reasons.append(
            "moderate predicted flood depth"
        )

    if probability >= 0.80:

        reasons.append(
            "very high flood probability"
        )

    elif probability >= 0.55:

        reasons.append(
            "elevated flood probability"
        )

    if people >= 1000:

        reasons.append(
            f"{people} people at risk"
        )

    elif people >= 300:

        reasons.append(
            f"high exposed population "
            f"({people})"
        )

    elif people >= 100:

        reasons.append(
            f"{people} people potentially affected"
        )

    if hospital:

        reasons.append(
            "hospital or critical "
            "infrastructure nearby"
        )

    if road:

        reasons.append(
            "major road affected"
        )

    if trend == "RISING":

        reasons.append(
            "water level rising"
        )

    elif trend == "STABLE":

        reasons.append(
            "water level not yet falling"
        )

    if vulnerable >= 200:

        reasons.append(
            "high vulnerable population"
        )

    elif vulnerable >= 50:

        reasons.append(
            "vulnerable population exposed"
        )

    if not reasons:

        reasons.append(
            "low combined flood and "
            "impact indicators"
        )

    return reasons[:5]


# ============================================================
# PUBLIC MODEL 3 FUNCTION
# ============================================================

def predict_hotspot(
    *,
    predicted_depth_cm,
    flood_probability,
    people_at_risk,
    hospital_nearby,
    major_road_affected,
    water_level_trend,
    vulnerable_count=0,
):

    package = (
        load_model_package()
    )

    model = package[
        "risk_model"
    ]

    # ========================================================
    # VALIDATED INPUT
    # ========================================================

    row = {

        "predicted_depth_cm":
            validate_numeric(
                "predicted_depth_cm",
                predicted_depth_cm,
            ),

        "flood_probability":
            validate_numeric(
                "flood_probability",
                flood_probability,
            ),

        "people_at_risk":
            int(
                round(
                    validate_numeric(
                        "people_at_risk",
                        people_at_risk,
                    )
                )
            ),

        "hospital_nearby":
            int(
                bool(
                    hospital_nearby
                )
            ),

        "major_road_affected":
            int(
                bool(
                    major_road_affected
                )
            ),

        "vulnerable_count":
            int(
                round(
                    validate_numeric(
                        "vulnerable_count",
                        vulnerable_count,
                    )
                )
            ),

        "water_level_trend":
            normalize_trend(
                water_level_trend
            ),
    }

    if (
        row[
            "vulnerable_count"
        ]
        >
        row[
            "people_at_risk"
        ]
    ):

        raise ValueError(
            "vulnerable_count cannot exceed "
            "people_at_risk."
        )

    # ========================================================
    # ML PREDICTION
    # ========================================================

    frame = pd.DataFrame(
        [row],
        columns=FEATURE_COLUMNS,
    )

    raw_ml_risk = str(
        model.predict(
            frame
        )[0]
    )

    probabilities = (
        model.predict_proba(
            frame
        )[0]
    )

    classifier = (
        model.named_steps[
            "classifier"
        ]
    )

    classes = [
        str(value)
        for value
        in classifier.classes_
    ]

    probability_map = {

        class_name:
            float(
                probabilities[
                    index
                ]
            )

        for index, class_name
        in enumerate(
            classes
        )
    }

    # ========================================================
    # ML PRIORITY SCORE
    # ========================================================

    ml_priority_score = int(
        round(
            100
            *
            sum(
                probability_map.get(
                    risk_class,
                    0.0,
                )
                *
                SEVERITY_WEIGHT[
                    risk_class
                ]

                for risk_class
                in RISK_CLASSES
            )
        )
    )

    # ========================================================
    # POLICY GUARDRAIL
    # ========================================================

    policy_score = (
        policy_priority_score(
            **row
        )
    )

    policy_risk = (
        risk_from_score(
            policy_score
        )
    )

    final_risk = (
        higher_risk(
            raw_ml_risk,
            policy_risk,
        )
    )

    guardrail_applied = (
        final_risk
        !=
        raw_ml_risk
    )

    final_priority_score = max(
        ml_priority_score,
        int(
            round(
                policy_score
            )
        ),
    )

    ml_confidence = float(
        max(
            probability_map.values()
        )
    )

    # ========================================================
    # OUTPUT
    # ========================================================

    return {

        "model":
            "hotspot_priority",

        "risk":
            final_risk,

        "priority_score":
            final_priority_score,

        "response_priority":
            response_priority_from_risk(
                final_risk
            ),

        "confidence":
            round(
                ml_confidence,
                4,
            ),

        "confidence_percent":
            round(
                ml_confidence
                * 100,
                2,
            ),

        "ml_confidence":
            round(
                ml_confidence,
                4,
            ),

        "raw_ml_risk":
            raw_ml_risk,

        "policy_risk":
            policy_risk,

        "ml_priority_score":
            ml_priority_score,

        "policy_priority_score":
            round(
                policy_score,
                2,
            ),

        "operational_guardrail_applied":
            guardrail_applied,

        "reasons":
            reasons_from_input(
                row
            ),

        "class_probabilities": {

            risk_class:
                round(
                    probability_map.get(
                        risk_class,
                        0.0,
                    ),
                    4,
                )

            for risk_class
            in RISK_CLASSES
        },

        "training_mode":
            package.get(
                "training_mode",
                "realtime",
            ),

        "model_source":
            "ml_realtime_with_policy_guardrail",

        "model_version":
            "1.2",
    }