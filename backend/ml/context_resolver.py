from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[1]
)

MAP_CONTEXT_DIR = (
    BACKEND_ROOT
    / "data"
    / "map_context"
)


# ============================================================
# GEOJSON
# ============================================================

def load_geojson(
    filename: str,
) -> dict[str, Any]:

    path = (
        MAP_CONTEXT_DIR
        / filename
    )

    if not path.exists():
        return {
            "type":
                "FeatureCollection",

            "features": [],
        }

    return json.loads(
        path.read_text(
            encoding="utf-8",
        )
    )


# ============================================================
# DISTANCE
# ============================================================

def haversine_m(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
) -> float:

    radius_m = 6_371_000.0

    lat1 = math.radians(
        latitude_1
    )

    lat2 = math.radians(
        latitude_2
    )

    delta_lat = math.radians(
        latitude_2
        - latitude_1
    )

    delta_lon = math.radians(
        longitude_2
        - longitude_1
    )

    a = (
        math.sin(
            delta_lat / 2
        ) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(
            delta_lon / 2
        ) ** 2
    )

    return (
        2
        * radius_m
        * math.asin(
            math.sqrt(a)
        )
    )


# ============================================================
# GEOMETRY COORDINATES
# ============================================================

def extract_points(
    geometry: dict[str, Any] | None,
) -> list[
    tuple[
        float,
        float,
    ]
]:

    if not geometry:
        return []

    geometry_type = (
        geometry.get(
            "type"
        )
    )

    coordinates = (
        geometry.get(
            "coordinates"
        )
    )

    if not coordinates:
        return []

    points: list[
        tuple[
            float,
            float,
        ]
    ] = []

    if geometry_type == "Point":

        longitude, latitude = (
            coordinates[:2]
        )

        points.append(
            (
                float(latitude),
                float(longitude),
            )
        )

    elif geometry_type in (
        "LineString",
        "MultiPoint",
    ):

        for coordinate in coordinates:

            longitude, latitude = (
                coordinate[:2]
            )

            points.append(
                (
                    float(latitude),
                    float(longitude),
                )
            )

    elif geometry_type == "MultiLineString":

        for line in coordinates:

            for coordinate in line:

                longitude, latitude = (
                    coordinate[:2]
                )

                points.append(
                    (
                        float(latitude),
                        float(longitude),
                    )
                )

    elif geometry_type == "Polygon":

        for ring in coordinates:

            for coordinate in ring:

                longitude, latitude = (
                    coordinate[:2]
                )

                points.append(
                    (
                        float(latitude),
                        float(longitude),
                    )
                )

    elif geometry_type == "MultiPolygon":

        for polygon in coordinates:

            for ring in polygon:

                for coordinate in ring:

                    longitude, latitude = (
                        coordinate[:2]
                    )

                    points.append(
                        (
                            float(latitude),
                            float(longitude),
                        )
                    )

    return points


# ============================================================
# FEATURE DISTANCE
# ============================================================

def feature_distance_m(
    latitude: float,
    longitude: float,
    feature: dict[str, Any],
) -> float | None:

    points = extract_points(
        feature.get(
            "geometry"
        )
    )

    if not points:
        return None

    distances = [
        haversine_m(
            latitude,
            longitude,
            point_lat,
            point_lon,
        )
        for (
            point_lat,
            point_lon,
        )
        in points
    ]

    return min(
        distances
    )


# ============================================================
# NEAREST FEATURE
# ============================================================

def find_nearest_feature(
    latitude: float,
    longitude: float,
    collection: dict[str, Any],
) -> dict[str, Any] | None:

    best_feature = None

    best_distance = None

    for feature in collection.get(
        "features",
        [],
    ):

        distance = (
            feature_distance_m(
                latitude,
                longitude,
                feature,
            )
        )

        if distance is None:
            continue

        if (
            best_distance is None
            or distance
            < best_distance
        ):
            best_distance = distance

            best_feature = feature

    if (
        best_feature is None
        or best_distance is None
    ):
        return None

    return {
        "feature":
            best_feature,

        "distance_m":
            round(
                best_distance,
                2,
            ),
    }


# ============================================================
# LOCATION CONTEXT
# ============================================================

def resolve_location_context(
    *,
    latitude: float,
    longitude: float,
    hospital_radius_m: float = 1000.0,
) -> dict[str, Any]:

    drainage = load_geojson(
        "drainage.geojson"
    )

    healthcare = load_geojson(
        "healthcare.geojson"
    )

    shelters = load_geojson(
        "candidate_shelters.geojson"
    )

    nearest_drain = (
        find_nearest_feature(
            latitude,
            longitude,
            drainage,
        )
    )

    nearest_hospital = (
        find_nearest_feature(
            latitude,
            longitude,
            healthcare,
        )
    )

    nearest_shelter = (
        find_nearest_feature(
            latitude,
            longitude,
            shelters,
        )
    )

    # --------------------------------------------------------
    # DRAIN
    # --------------------------------------------------------

    if nearest_drain:

        drain_properties = (
            nearest_drain[
                "feature"
            ].get(
                "properties",
                {},
            )
        )

        drain_id = str(
            drain_properties.get(
                "id",
                "UNKNOWN_DRAIN",
            )
        )

        drain_name = (
            drain_properties.get(
                "name"
            )
            or "Unnamed drain"
        )

        drain_distance_m = (
            nearest_drain[
                "distance_m"
            ]
        )

    else:

        drain_id = (
            "UNKNOWN_DRAIN"
        )

        drain_name = None

        drain_distance_m = None

    # --------------------------------------------------------
    # HOSPITAL
    # --------------------------------------------------------

    if nearest_hospital:

        hospital_properties = (
            nearest_hospital[
                "feature"
            ].get(
                "properties",
                {},
            )
        )

        hospital_name = (
            hospital_properties.get(
                "name"
            )
            or "Unnamed healthcare facility"
        )

        hospital_distance_m = (
            nearest_hospital[
                "distance_m"
            ]
        )

        hospital_nearby = (
            hospital_distance_m
            <= hospital_radius_m
        )

    else:

        hospital_name = None

        hospital_distance_m = None

        hospital_nearby = False

    # --------------------------------------------------------
    # SHELTER
    # --------------------------------------------------------

    if nearest_shelter:

        shelter_properties = (
            nearest_shelter[
                "feature"
            ].get(
                "properties",
                {},
            )
        )

        shelter_name = (
            shelter_properties.get(
                "name"
            )
            or "Unnamed candidate shelter"
        )

        shelter_distance_m = (
            nearest_shelter[
                "distance_m"
            ]
        )

        shelter_distance_km = round(
            shelter_distance_m
            / 1000.0,
            3,
        )

    else:

        shelter_name = None

        shelter_distance_m = None

        shelter_distance_km = None

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "latitude":
            latitude,

        "longitude":
            longitude,

        "nearest_drain": {
            "drain_id":
                drain_id,

            "name":
                drain_name,

            "distance_m":
                drain_distance_m,
        },

        "nearest_hospital": {
            "name":
                hospital_name,

            "distance_m":
                hospital_distance_m,

            "nearby":
                hospital_nearby,

            "nearby_radius_m":
                hospital_radius_m,
        },

        "nearest_shelter": {
            "name":
                shelter_name,

            "distance_m":
                shelter_distance_m,

            "distance_km":
                shelter_distance_km,
        },

        "data_sources": [
            "OpenStreetMap cached drainage",
            "OpenStreetMap cached healthcare",
            "OpenStreetMap cached candidate shelters",
        ],
    }