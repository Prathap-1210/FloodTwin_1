from __future__ import annotations

from typing import Any

from ml.model1 import (
    predict_flood,
)

from ml.model2 import (
    predict_drainage_status,
)

from ml.model3 import (
    predict_hotspot,
)

from ml.model4 import (
    predict_road_risk,
)

from ml.model5 import (
    predict_evacuation,
)

from ml.model6 import (
    predict_response_effectiveness,
)


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_FORECAST_MINUTES = {
    30,
    60,
    90,
    180,
}


# ============================================================
# BASIC HELPERS
# ============================================================

def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def clamp01(
    value: float,
) -> float:
    return clamp(
        float(value),
        0.0,
        1.0,
    )


def required_float(
    payload: dict,
    key: str,
) -> float:

    if key not in payload:
        raise ValueError(
            f"Missing required ML input: {key}"
        )

    value = payload[key]

    if value is None:
        raise ValueError(
            f"ML input cannot be null: {key}"
        )

    try:
        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid numeric ML input for {key}: {value}"
        ) from exc


def required_int(
    payload: dict,
    key: str,
) -> int:

    value = required_float(
        payload,
        key,
    )

    return int(
        round(
            value
        )
    )


def optional_float(
    payload: dict,
    key: str,
    default: float,
) -> float:

    value = payload.get(
        key,
        default,
    )

    if value is None:
        return float(
            default
        )

    try:
        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid numeric ML input for {key}: {value}"
        ) from exc


def optional_int(
    payload: dict,
    key: str,
    default: int,
) -> int:

    value = optional_float(
        payload,
        key,
        float(
            default
        ),
    )

    return int(
        round(
            value
        )
    )


def action_flag(
    payload: dict,
    key: str,
    default: int = 1,
) -> int:

    value = payload.get(
        key,
        default,
    )

    if isinstance(
        value,
        bool,
    ):
        return int(
            value
        )

    try:
        numeric = int(
            round(
                float(
                    value
                )
            )
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid response action flag for {key}: {value}"
        ) from exc

    return 1 if numeric > 0 else 0


# ============================================================
# HOTSPOT PROBABILITY
# ============================================================

def hotspot_probability_from_result(
    hotspot_result: dict,
) -> float:

    probabilities = (
        hotspot_result.get(
            "class_probabilities",
            {},
        )
        or {}
    )

    severe = clamp01(
        float(
            probabilities.get(
                "SEVERE",
                0.0,
            )
        )
    )

    high = clamp01(
        float(
            probabilities.get(
                "HIGH",
                0.0,
            )
        )
    )

    # Operational helper:
    #
    # SEVERE receives full weight.
    # HIGH receives partial weight.
    #
    #This is not a separately trained probability.
    #

    return clamp01(
        severe
        +
        (
            0.65 *
            high
        )
    )


# ============================================================
# DRAINAGE BLOCKAGE PROBABILITY
# ============================================================

def drainage_blockage_probability(
    drainage_result: dict,
) -> float:

    probabilities = (
        drainage_result.get(
            "class_probabilities",
            {},
        )
        or {}
    )

    return clamp01(
        float(
            probabilities.get(
                "PROBABLE_BLOCKAGE",
                0.0,
            )
        )
    )


# ============================================================
# ROAD ACCESSIBILITY
# ============================================================

def road_accessibility_from_risk(
    road_result: dict,
) -> float:

    probability = clamp01(
        float(
            road_result.get(
                "road_risk_probability",
                0.0,
            )
        )
    )

    return clamp01(
        1.0 -
        probability
    )


# ============================================================
# VALIDATE FORECAST
# ============================================================

def validate_forecast_minutes(
    payload: dict,
) -> int:

    raw_value = payload.get(
        "forecast_minutes",
        60,
    )

    try:
        forecast_minutes = int(
            raw_value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "forecast_minutes must be one of "
            "30, 60, 90 or 180."
        ) from exc

    if (
        forecast_minutes
        not in
        ALLOWED_FORECAST_MINUTES
    ):
        raise ValueError(
            "forecast_minutes must be one of "
            "30, 60, 90 or 180."
        )

    return forecast_minutes


# ============================================================
# MAIN SIX-MODEL ORCHESTRATOR
# ============================================================

def run_floodtwin_ml(
    payload: dict,
) -> dict:

    if not isinstance(
        payload,
        dict,
    ):
        raise ValueError(
            "FloodTwin ML payload must be a dictionary."
        )

    # ========================================================
    # REQUEST CONTEXT
    # ========================================================

    forecast_minutes = (
        validate_forecast_minutes(
            payload
        )
    )

    rainfall_mm_hr = max(
        0.0,
        required_float(
            payload,
            "rainfall_mm_hr",
        ),
    )

    recent_rainfall_mm = max(
        0.0,
        required_float(
            payload,
            "recent_rainfall_mm",
        ),
    )

    antecedent_rainfall_mm = max(
        0.0,
        required_float(
            payload,
            "antecedent_rainfall_mm",
        ),
    )

    zone_id = str(
        payload.get(
            "zone_id",
            "UNKNOWN_ZONE",
        )
        or
        "UNKNOWN_ZONE"
    )

    location_name = (
        payload.get(
            "location_name"
        )
    )

    latitude = (
        optional_float(
            payload,
            "latitude",
            0.0,
        )
        if payload.get(
            "latitude"
        )
        is not None
        else None
    )

    longitude = (
        optional_float(
            payload,
            "longitude",
            0.0,
        )
        if payload.get(
            "longitude"
        )
        is not None
        else None
    )

    # ========================================================
    # MODEL 1 INPUTS
    # ========================================================

    elevation_m = (
        required_float(
            payload,
            "elevation_m",
        )
    )

    slope_deg = max(
        0.0,
        required_float(
            payload,
            "slope_deg",
        ),
    )

    built_up_percent = clamp(
        required_float(
            payload,
            "built_up_percent",
        ),
        0.0,
        100.0,
    )

    distance_to_nearest_drain_m = max(
        0.0,
        required_float(
            payload,
            "distance_to_nearest_drain_m",
        ),
    )

    drain_density_m_per_km2 = max(
        0.0,
        required_float(
            payload,
            "drain_density_m_per_km2",
        ),
    )

    previous_depth_cm = max(
        0.0,
        required_float(
            payload,
            "previous_depth_cm",
        ),
    )

    # ========================================================
    # MODEL 1 — FLOOD PREDICTION
    # ========================================================

    flood_payload = {
        "zone_id":
            zone_id,

        "rainfall_mm_hr":
            rainfall_mm_hr,

        "recent_rainfall_mm":
            recent_rainfall_mm,

        "antecedent_rainfall_mm":
            antecedent_rainfall_mm,

        "elevation_m":
            elevation_m,

        "slope_deg":
            slope_deg,

        "built_up_percent":
            built_up_percent,

        "distance_to_nearest_drain_m":
            distance_to_nearest_drain_m,

        "drain_density_m_per_km2":
            drain_density_m_per_km2,

        "previous_depth_cm":
            previous_depth_cm,
    }

    flood_result = (
        predict_flood(
            flood_payload,
            [
                forecast_minutes
            ],
        )
    )

    predictions = (
        flood_result.get(
            "predictions",
            []
        )
    )

    if not predictions:
        raise ValueError(
            "Model 1 returned no flood prediction."
        )

    flood_prediction = (
        predictions[0]
    )

    predicted_depth_cm = max(
        0.0,
        float(
            flood_prediction.get(
                "predicted_depth_cm",
                0.0,
            )
        ),
    )

    flood_probability = clamp01(
        float(
            flood_prediction.get(
                "flood_probability",
                0.0,
            )
        )
    )

    flood_risk = str(
        flood_prediction.get(
            "risk",
            "UNKNOWN",
        )
    )

    # ========================================================
    # MODEL 2 INPUTS
    # ========================================================

    drain_id = str(
        payload.get(
            "drain_id",
            "UNKNOWN_DRAIN",
        )
        or
        "UNKNOWN_DRAIN"
    )

    c2_diameter_m = max(
        0.0,
        required_float(
            payload,
            "c2_diameter_m",
        ),
    )

    capacity_percent = max(
        0.0,
        required_float(
            payload,
            "capacity_percent",
        ),
    )

    upstream_load_percent = max(
        0.0,
        required_float(
            payload,
            "upstream_load_percent",
        ),
    )

    downstream_load_percent = max(
        0.0,
        required_float(
            payload,
            "downstream_load_percent",
        ),
    )

    normal_capacity_percent = max(
        0.0,
        required_float(
            payload,
            "normal_capacity_percent",
        ),
    )

    # ========================================================
    # MODEL 2 — DRAINAGE ANOMALY
    # ========================================================

    drainage_result = (
        predict_drainage_status(
            {
                "drain_id":
                    drain_id,

                "rainfall_mm_hr":
                    rainfall_mm_hr,

                "c2_diameter_m":
                    c2_diameter_m,

                "capacity_percent":
                    capacity_percent,

                "upstream_load_percent":
                    upstream_load_percent,

                "downstream_load_percent":
                    downstream_load_percent,

                # Coupling:
                #
                # Model 1 predicted flood depth is passed
                # directly into Model 2.
                #
                "nearby_water_depth_cm":
                    predicted_depth_cm,

                "normal_capacity_percent":
                    normal_capacity_percent,
            }
        )
    )

    drain_load_percent = (
        capacity_percent
    )

    blockage_probability = (
        drainage_blockage_probability(
            drainage_result
        )
    )

    drain_status = str(
        drainage_result.get(
            "status",
            "UNKNOWN",
        )
    )

    # ========================================================
    # MODEL 3 INPUTS
    # ========================================================

    people_at_risk = max(
        0,
        required_int(
            payload,
            "people_at_risk",
        ),
    )

    hospital_nearby = bool(
        payload.get(
            "hospital_nearby",
            False,
        )
    )

    major_road_affected = bool(
        payload.get(
            "major_road_affected",
            False,
        )
    )

    water_level_trend = str(
        payload.get(
            "water_level_trend",
            "RISING",
        )
        or
        "RISING"
    ).upper()

    vulnerable_count = max(
        0,
        optional_int(
            payload,
            "vulnerable_count",
            0,
        ),
    )

    # ========================================================
    # MODEL 3 — HOTSPOT PRIORITY
    # ========================================================

    hotspot_result = (
        predict_hotspot(
            predicted_depth_cm=
                predicted_depth_cm,

            flood_probability=
                flood_probability,

            people_at_risk=
                people_at_risk,

            hospital_nearby=
                hospital_nearby,

            major_road_affected=
                major_road_affected,

            water_level_trend=
                water_level_trend,

            vulnerable_count=
                vulnerable_count,
        )
    )

    hotspot_probability = (
        hotspot_probability_from_result(
            hotspot_result
        )
    )

    hotspot_risk = str(
        hotspot_result.get(
            "risk",
            "UNKNOWN",
        )
    )

    response_priority = str(
        hotspot_result.get(
            "response_priority",
            "P4",
        )
    )

    # ========================================================
    # MODEL 4 INPUTS
    # ========================================================

    distance_to_hotspot_m = max(
        0.0,
        required_float(
            payload,
            "distance_to_hotspot_m",
        ),
    )

    road_elevation_m = (
        required_float(
            payload,
            "road_elevation_m",
        )
    )

    road_type = str(
        payload.get(
            "road_type",
            "residential",
        )
        or
        "residential"
    )

    # ========================================================
    # MODEL 4 — ROAD RISK
    # ========================================================

    road_result = (
        predict_road_risk(
            predicted_flood_depth_cm=
                predicted_depth_cm,

            rainfall_intensity_mm_hr=
                rainfall_mm_hr,

            drainage_load_percent=
                drain_load_percent,

            hotspot_risk_probability=
                hotspot_probability,

            distance_to_hotspot_m=
                distance_to_hotspot_m,

            road_elevation_m=
                road_elevation_m,

            road_type=
                road_type,

            forecast_minutes=
                forecast_minutes,
        )
    )

    road_risk_probability = clamp01(
        float(
            road_result.get(
                "road_risk_probability",
                0.0,
            )
        )
    )

    road_risk = str(
        road_result.get(
            "risk_class",
            "UNKNOWN",
        )
    )

    road_accessibility = (
        road_accessibility_from_risk(
            road_result
        )
    )

    # ========================================================
    # MODEL 5 INPUTS
    # ========================================================

    population = max(
        0,
        required_int(
            payload,
            "population",
        ),
    )

    water_rise_rate_cm_hr = max(
        0.0,
        required_float(
            payload,
            "water_rise_rate_cm_hr",
        ),
    )

    distance_to_shelter_km = max(
        0.0,
        required_float(
            payload,
            "distance_to_shelter_km",
        ),
    )

    vulnerability_index = clamp01(
        required_float(
            payload,
            "vulnerability_index",
        )
    )

    # ========================================================
    # MODEL 5 — EVACUATION DEMAND
    # ========================================================

    evacuation_result = (
        predict_evacuation(
            population=
                population,

            flood_depth_cm=
                predicted_depth_cm,

            flood_probability=
                flood_probability,

            water_rise_rate_cm_hr=
                water_rise_rate_cm_hr,

            road_accessibility=
                road_accessibility,

            distance_to_shelter_km=
                distance_to_shelter_km,

            vulnerability_index=
                vulnerability_index,
        )
    )

    predicted_evacuation_count = max(
        0,
        int(
            round(
                float(
                    evacuation_result.get(
                        "predicted_evacuation_count",
                        0,
                    )
                )
            )
        ),
    )

    evacuation_priority = str(
        evacuation_result.get(
            "priority",
            "LOW",
        )
    )

    # ========================================================
    # MODEL 6 ACTION INPUTS
    # ========================================================

    clear_drain = (
        action_flag(
            payload,
            "clear_drain",
            1,
        )
    )

    deploy_pump = (
        action_flag(
            payload,
            "deploy_pump",
            1,
        )
    )

    close_road = (
        action_flag(
            payload,
            "close_road",
            1,
        )
    )

    evacuate = (
        action_flag(
            payload,
            "evacuate",
            1,
        )
    )

    pump_capacity_index = clamp01(
        optional_float(
            payload,
            "pump_capacity_index",
            0.8,
        )
    )

    response_delay_min = max(
        0.0,
        optional_float(
            payload,
            "response_delay_min",
            20.0,
        ),
    )

    # ========================================================
    # MODEL 6 — RESPONSE EFFECTIVENESS
    # ========================================================

    response_result = (
        predict_response_effectiveness(
            flood_depth_cm=
                predicted_depth_cm,

            flood_probability=
                flood_probability,

            water_rise_rate=
                water_rise_rate_cm_hr,

            drain_load_percent=
                drain_load_percent,

            blockage_probability=
                blockage_probability,

            # This represents the population currently
            # exposed before intervention.
            #
            # It intentionally does NOT replace this value
            # with Model 5 evacuation demand.
            
            people_at_risk=
                people_at_risk,

            vulnerable_population=
                vulnerable_count,

            road_accessibility=
                road_accessibility,

            clear_drain=
                clear_drain,

            deploy_pump=
                deploy_pump,

            close_road=
                close_road,

            evacuate=
                evacuate,

            pump_capacity_index=
                pump_capacity_index,

            response_delay_min=
                response_delay_min,

            forecast_minutes=
                forecast_minutes,
        )
    )

    impact_reduction_percent = max(
        0.0,
        float(
            response_result.get(
                "impact_reduction_percent",
                0.0,
            )
        ),
    )

    # ========================================================
    # LOCATION
    # ========================================================

    location = {
        "zone_id":
            zone_id,

        "location_name":
            location_name,

        "latitude":
            latitude,

        "longitude":
            longitude,
    }

    # ========================================================
    # DERIVED OPERATIONAL CONTEXT
    # ========================================================

    operational_context = {

        
        #These are derived from model outputs.
        #They are not additional trained models.

        "hotspot_probability":
            hotspot_probability,

        "blockage_probability":
            blockage_probability,

        "road_risk_probability":
            road_risk_probability,

        "road_accessibility":
            road_accessibility,

        "selected_actions": {
            "clear_drain":
                bool(
                    clear_drain
                ),

            "deploy_pump":
                bool(
                    deploy_pump
                ),

            "close_road":
                bool(
                    close_road
                ),

            "evacuate":
                bool(
                    evacuate
                ),
        },
    }

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "system":
            "FloodTwin AI",

        "pipeline":
            "Predict → Diagnose → Decide → Re-simulate",

        "location":
            location,

        "forecast_minutes":
            forecast_minutes,

        # ----------------------------------------------------
        # MODEL 1
        # ----------------------------------------------------

        "flood":
            flood_result,

        # ----------------------------------------------------
        # MODEL 2
        # ----------------------------------------------------

        "drainage":
            drainage_result,

        # ----------------------------------------------------
        # MODEL 3
        # ----------------------------------------------------

        "hotspot":
            hotspot_result,

        # ----------------------------------------------------
        # MODEL 4
        # ----------------------------------------------------

        "road":
            road_result,

        # ----------------------------------------------------
        # MODEL 5
        # ----------------------------------------------------

        "evacuation":
            evacuation_result,

        # ----------------------------------------------------
        # MODEL 6
        # ----------------------------------------------------

        "response_effectiveness":
            response_result,

        # ----------------------------------------------------
        # DERIVED CONTEXT
        # ----------------------------------------------------

        "operational_context":
            operational_context,

        # ----------------------------------------------------
        # FRONTEND SUMMARY
        # ----------------------------------------------------

        "summary": {

            "predicted_depth_cm":
                predicted_depth_cm,

            "flood_probability":
                flood_probability,

            "flood_risk":
                flood_risk,

            "drain_status":
                drain_status,

            "hotspot_risk":
                hotspot_risk,

            "response_priority":
                response_priority,

            "road_risk":
                road_risk,

            "evacuation_count":
                predicted_evacuation_count,

            "evacuation_priority":
                evacuation_priority,

            "impact_reduction_percent":
                impact_reduction_percent,
        },
    }