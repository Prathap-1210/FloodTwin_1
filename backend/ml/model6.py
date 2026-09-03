from __future__ import annotations

from functools import lru_cache
from pathlib import Path

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
    / "model6"
)

MODEL_PATH = (
    MODEL_DIR
    / "response_effectiveness_realtime.joblib"
)


# ============================================================
# MODEL CONTRACT
# ============================================================

FEATURE_COLUMNS = [
    "flood_depth_cm",
    "flood_probability",
    "water_rise_rate",
    "drain_load_percent",
    "blockage_probability",
    "people_at_risk",
    "vulnerable_population",
    "road_accessibility",
    "clear_drain",
    "deploy_pump",
    "close_road",
    "evacuate",
    "pump_capacity_index",
    "response_delay_min",
    "forecast_minutes",
]


TARGET_COLUMNS = [
    "post_flood_depth_cm",
    "post_people_at_risk",
    "post_drain_load_percent",
]


FEATURE_LIMITS = {
    "flood_depth_cm": (0.0, 300.0),
    "flood_probability": (0.0, 1.0),
    "water_rise_rate": (-10.0, 30.0),
    "drain_load_percent": (0.0, 300.0),
    "blockage_probability": (0.0, 1.0),
    "people_at_risk": (0.0, 100000.0),
    "vulnerable_population": (0.0, 100000.0),
    "road_accessibility": (0.0, 1.0),
    "clear_drain": (0, 1),
    "deploy_pump": (0, 1),
    "close_road": (0, 1),
    "evacuate": (0, 1),
    "pump_capacity_index": (0.0, 1.0),
    "response_delay_min": (0.0, 240.0),
    "forecast_minutes": (1.0, 360.0),
}


# ============================================================
# LOAD MODEL
# ============================================================

@lru_cache(maxsize=1)
def load_model_package():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model 6 not found: {MODEL_PATH}"
        )

    package = joblib.load(
        MODEL_PATH
    )

    if not isinstance(
        package,
        dict,
    ):
        raise ValueError(
            "Model 6 artifact must be a packaged dictionary."
        )

    if "model" not in package:
        raise ValueError(
            "Model 6 package does not contain 'model'."
        )

    artifact_features = package.get(
        "feature_names"
    )

    if (
        artifact_features is not None
        and artifact_features != FEATURE_COLUMNS
    ):
        raise ValueError(
            "Model 6 feature schema mismatch."
        )

    return package


# ============================================================
# VALIDATION
# ============================================================

def validate_payload(
    payload: dict,
):

    row = {}

    for feature in FEATURE_COLUMNS:

        if feature not in payload:
            raise ValueError(
                f"Missing Model 6 feature: {feature}"
            )

        value = float(
            payload[
                feature
            ]
        )

        minimum, maximum = (
            FEATURE_LIMITS[
                feature
            ]
        )

        if not (
            minimum
            <= value
            <= maximum
        ):
            raise ValueError(
                f"{feature} must be between "
                f"{minimum} and {maximum}."
            )

        row[
            feature
        ] = value

    # ========================================================
    # BOOLEAN ACTION FEATURES
    # ========================================================

    for feature in [
        "clear_drain",
        "deploy_pump",
        "close_road",
        "evacuate",
    ]:

        row[
            feature
        ] = int(
            round(
                row[
                    feature
                ]
            )
        )

    # ========================================================
    # CONSISTENCY CHECK
    # ========================================================

    if (
        row[
            "vulnerable_population"
        ]
        >
        row[
            "people_at_risk"
        ]
    ):
        raise ValueError(
            "vulnerable_population cannot exceed "
            "people_at_risk."
        )

    # If no pump is deployed, pump capacity must be zero.
    if (
        row[
            "deploy_pump"
        ]
        == 0
    ):

        row[
            "pump_capacity_index"
        ] = 0.0

    return row


# ============================================================
# EFFECTIVENESS SCORING
# ============================================================

def safe_reduction(
    before,
    after,
):

    before = np.asarray(
        before,
        dtype=float,
    )

    after = np.asarray(
        after,
        dtype=float,
    )

    denominator = np.maximum(
        np.abs(
            before
        ),
        1.0,
    )

    return np.clip(
        (
            before
            -
            after
        )
        /
        denominator,
        -1.0,
        1.0,
    )


def effectiveness_components(
    flood_depth_cm,
    people_at_risk,
    drain_load_percent,
    post_flood_depth_cm,
    post_people_at_risk,
    post_drain_load_percent,
):

    depth_reduction = (
        safe_reduction(
            flood_depth_cm,
            post_flood_depth_cm,
        )
    )

    people_reduction = (
        safe_reduction(
            people_at_risk,
            post_people_at_risk,
        )
    )

    drain_reduction = (
        safe_reduction(
            drain_load_percent,
            post_drain_load_percent,
        )
    )

    score = (
        0.40
        * depth_reduction

        +
        0.40
        * people_reduction

        +
        0.20
        * drain_reduction
    )

    score = np.clip(
        score,
        0.0,
        1.0,
    )

    return {
        "depth_reduction_ratio":
            depth_reduction,

        "people_reduction_ratio":
            people_reduction,

        "drain_reduction_ratio":
            drain_reduction,

        "effectiveness_score":
            score,

        "impact_reduction_percent":
            score
            * 100.0,
    }


# ============================================================
# ENSEMBLE UNCERTAINTY
# ============================================================

def ensemble_uncertainty(
    model,
    frame,
    target_scales,
):

    tree_predictions = np.asarray(
        [
            estimator.predict(
                frame.to_numpy()
            )[0]

            for estimator
            in model.estimators_
        ],
        dtype=float,
    )

    standard_deviation = np.std(
        tree_predictions,
        axis=0,
    )

    normalized = []

    for index, target in enumerate(
        TARGET_COLUMNS
    ):

        scale = max(
            float(
                target_scales.get(
                    target,
                    1.0,
                )
            ),
            1.0,
        )

        normalized.append(
            standard_deviation[
                index
            ]
            /
            scale
        )

    uncertainty = float(
        np.clip(
            np.mean(
                normalized
            ),
            0.0,
            1.0,
        )
    )

    confidence = float(
        np.clip(
            1.0
            -
            uncertainty,
            0.0,
            1.0,
        )
    )

    return (
        confidence,
        uncertainty,
        standard_deviation,
    )


# ============================================================
# PUBLIC MODEL 6 FUNCTION
# ============================================================

def predict_response_effectiveness(
    **payload,
):

    row = validate_payload(
        payload
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

    prediction = (
        model.predict(
            frame
        )[0]
    )

    post_depth = max(
        float(
            prediction[
                0
            ]
        ),
        0.0,
    )

    post_people = max(
        float(
            prediction[
                1
            ]
        ),
        0.0,
    )

    post_drain = max(
        float(
            prediction[
                2
            ]
        ),
        0.0,
    )

    components = (
        effectiveness_components(
            row[
                "flood_depth_cm"
            ],
            row[
                "people_at_risk"
            ],
            row[
                "drain_load_percent"
            ],
            post_depth,
            post_people,
            post_drain,
        )
    )

    (
        confidence,
        uncertainty,
        target_std,
    ) = ensemble_uncertainty(
        model,
        frame,
        package.get(
            "target_scales",
            {},
        ),
    )

    return {

        "model":
            "response_effectiveness",

        "post_flood_depth_cm":
            round(
                post_depth,
                2,
            ),

        "post_people_at_risk":
            int(
                round(
                    post_people
                )
            ),

        "post_drain_load_percent":
            round(
                post_drain,
                2,
            ),

        "depth_reduction_cm":
            round(
                row[
                    "flood_depth_cm"
                ]
                -
                post_depth,
                2,
            ),

        "people_risk_reduction":
            int(
                round(
                    row[
                        "people_at_risk"
                    ]
                    -
                    post_people
                )
            ),

        "drain_load_reduction_points":
            round(
                row[
                    "drain_load_percent"
                ]
                -
                post_drain,
                2,
            ),

        "impact_reduction_percent":
            round(
                float(
                    components[
                        "impact_reduction_percent"
                    ]
                ),
                2,
            ),

        "effectiveness_score":
            round(
                float(
                    components[
                        "effectiveness_score"
                    ]
                ),
                4,
            ),

        "confidence":
            round(
                confidence,
                4,
            ),

        "confidence_percent":
            round(
                confidence
                * 100,
                2,
            ),

        "uncertainty":
            round(
                uncertainty,
                4,
            ),

        "target_prediction_std": {

            TARGET_COLUMNS[
                index
            ]:
                round(
                    float(
                        target_std[
                            index
                        ]
                    ),
                    3,
                )

            for index
            in range(
                len(
                    TARGET_COLUMNS
                )
            )
        },

        "forecast_minutes":
            int(
                round(
                    row[
                        "forecast_minutes"
                    ]
                )
            ),

        "training_mode":
            package.get(
                "training_mode",
                "realtime",
            ),

        "model_source":
            "ml_realtime",

        "model_version":
            package.get(
                "model_version",
                "unknown",
            ),

        "trained_at_utc":
            package.get(
                "trained_at_utc"
            ),

        "uncertainty_note":
            (
                "Confidence is derived from Random Forest "
                "tree disagreement and is not a calibrated "
                "real-world probability."
            ),
    }