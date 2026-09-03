from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from ml.model1 import predict_flood

from ml.context_resolver import (
    resolve_location_context,
)


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[1]
)

LOCATION_FEATURES_PATH = (
    BACKEND_ROOT
    / "data"
    / "ml_context"
    / "chennai_location_features.csv"
)


# ============================================================
# HELPERS
# ============================================================

def _to_float(
    value: Any,
    default: float = 0.0,
) -> float:
    try:
        if value in (
            None,
            "",
        ):
            return default

        return float(value)

    except (
        TypeError,
        ValueError,
    ):
        return default


# ============================================================
# LOAD CHENNAI GIS LOCATIONS
# ============================================================

def load_chennai_locations() -> list[dict[str, str]]:

    if not LOCATION_FEATURES_PATH.exists():

        raise FileNotFoundError(
            "Missing Chennai GIS feature table: "
            f"{LOCATION_FEATURES_PATH}"
        )

    with LOCATION_FEATURES_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        return list(
            csv.DictReader(file)
        )


# ============================================================
# FLOOD SCANNER
# ============================================================

def scan_flood_locations(
    *,
    rainfall_mm_hr: float,
    recent_rainfall_mm: float,
    antecedent_rainfall_mm: float,
    forecast_minutes: int,
    previous_depth_mode: str = "reference",
    minimum_probability: float = 0.40,
    minimum_depth_cm: float = 5.0,
    limit: int = 100,
) -> dict[str, Any]:

    locations = (
        load_chennai_locations()
    )

    affected: list[
        dict[str, Any]
    ] = []

    # ========================================================
    # MODEL 1 SCAN
    # ========================================================

    for row in locations:

        if (
            previous_depth_mode
            == "reference"
        ):
            previous_depth_cm = (
                _to_float(
                    row.get(
                        "observed_reference_depth_cm"
                    )
                )
            )

        else:
            previous_depth_cm = 0.0

        payload = {

            "rainfall_mm_hr":
                rainfall_mm_hr,

            "recent_rainfall_mm":
                recent_rainfall_mm,

            "antecedent_rainfall_mm":
                antecedent_rainfall_mm,

            "elevation_m":
                _to_float(
                    row.get(
                        "elevation_m"
                    )
                ),

            "slope_deg":
                _to_float(
                    row.get(
                        "slope_deg"
                    )
                ),

            "built_up_percent":
                _to_float(
                    row.get(
                        "built_up_percent"
                    )
                ),

            "distance_to_nearest_drain_m":
                _to_float(
                    row.get(
                        "distance_to_nearest_drain_m"
                    )
                ),

            "drain_density_m_per_km2":
                _to_float(
                    row.get(
                        "drain_density_m_per_km2"
                    )
                ),

            "previous_depth_cm":
                previous_depth_cm,
        }

        result = (
            predict_flood(
                payload,
                horizons=[
                    forecast_minutes
                ],
            )
        )

        predictions = (
            result.get(
                "predictions",
                [],
            )
        )

        if not predictions:
            continue

        prediction = (
            predictions[0]
        )

        depth = _to_float(
            prediction.get(
                "predicted_depth_cm"
            )
        )

        probability = _to_float(
            prediction.get(
                "flood_probability"
            )
        )

        # ----------------------------------------------------
        # FILTER LOW-RISK LOCATIONS
        # ----------------------------------------------------

        if (
            depth
            < minimum_depth_cm
            and probability
            < minimum_probability
        ):
            continue

        affected.append(
            {
                "location_id":
                    row.get(
                        "location_id"
                    ),

                "zone":
                    row.get(
                        "zone"
                    )
                    or None,

                "ward":
                    row.get(
                        "ward"
                    )
                    or None,

                "latitude":
                    _to_float(
                        row.get(
                            "latitude"
                        )
                    ),

                "longitude":
                    _to_float(
                        row.get(
                            "longitude"
                        )
                    ),

                "elevation_m":
                    _to_float(
                        row.get(
                            "elevation_m"
                        )
                    ),

                "slope_deg":
                    _to_float(
                        row.get(
                            "slope_deg"
                        )
                    ),

                "built_up_percent":
                    _to_float(
                        row.get(
                            "built_up_percent"
                        )
                    ),

                "distance_to_nearest_drain_m":
                    _to_float(
                        row.get(
                            "distance_to_nearest_drain_m"
                        )
                    ),

                "drain_density_m_per_km2":
                    _to_float(
                        row.get(
                            "drain_density_m_per_km2"
                        )
                    ),

                "previous_depth_cm":
                    previous_depth_cm,

                "predicted_depth_cm":
                    depth,

                "flood_probability":
                    probability,

                "risk":
                    prediction.get(
                        "risk"
                    ),

                "forecast_minutes":
                    forecast_minutes,
            }
        )

    # ========================================================
    # SORT MOST AFFECTED FIRST
    # ========================================================

    affected.sort(
        key=lambda item: (
            item[
                "flood_probability"
            ],
            item[
                "predicted_depth_cm"
            ],
        ),
        reverse=True,
    )

    # Keep true total before limit.
    total_affected_count = (
        len(
            affected
        )
    )

    # ========================================================
    # LIMIT RETURNED LOCATIONS
    # ========================================================

    returned_locations = (
        affected[
            : max(
                1,
                limit,
            )
        ]
    )

    # ========================================================
    # REAL MAP CONTEXT
    # ========================================================

    for location in returned_locations:

        context = (
            resolve_location_context(
                latitude=(
                    location[
                        "latitude"
                    ]
                ),
                longitude=(
                    location[
                        "longitude"
                    ]
                ),
            )
        )

        location[
            "context"
        ] = context

    # ========================================================
    # DYNAMIC MAP BOUNDS
    # ========================================================

    if returned_locations:

        latitudes = [
            item[
                "latitude"
            ]
            for item
            in returned_locations
        ]

        longitudes = [
            item[
                "longitude"
            ]
            for item
            in returned_locations
        ]

        bounds = {

            "south":
                min(
                    latitudes
                ),

            "north":
                max(
                    latitudes
                ),

            "west":
                min(
                    longitudes
                ),

            "east":
                max(
                    longitudes
                ),
        }

    else:

        bounds = None

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "forecast_minutes":
            forecast_minutes,

        "rainfall": {

            "rainfall_mm_hr":
                rainfall_mm_hr,

            "recent_rainfall_mm":
                recent_rainfall_mm,

            "antecedent_rainfall_mm":
                antecedent_rainfall_mm,
        },

        "total_scanned_locations":
            len(
                locations
            ),

        "total_affected_count":
            total_affected_count,

        "returned_count":
            len(
                returned_locations
            ),

        # Kept for frontend compatibility.
        "affected_count":
            len(
                returned_locations
            ),

        "affected_locations":
            returned_locations,

        "bounds":
            bounds,

        "data_sources": [
            (
                "Chennai GIS feature table"
            ),
            (
                "FloodTwin Model 1"
            ),
            (
                "OpenStreetMap cached drainage"
            ),
            (
                "OpenStreetMap cached healthcare"
            ),
            (
                "OpenStreetMap cached candidate shelters"
            ),
        ],
    }