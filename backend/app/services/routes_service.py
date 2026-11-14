from functools import lru_cache
from pathlib import Path
from typing import Any

import networkx as nx
import osmnx as ox

from shapely.geometry import (
    LineString,
    Polygon,
)

from shapely.ops import substring

from app.schemas.routes import (
    RouteGeometry,
    RouteOption,
    RouteRequest,
    SafeRouteResponse,
)


# ========================================================
# PATHS
# ========================================================

BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

GRAPH_PATH = (
    BACKEND_ROOT
    / "data"
    / "velachery_drive.graphml"
)


# ========================================================
# DEFAULT DEMO LOCATIONS
# ========================================================

DEFAULT_ORIGIN_LAT = 12.9823
DEFAULT_ORIGIN_LON = 80.2224

DEFAULT_DESTINATION_LAT = 12.9900
DEFAULT_DESTINATION_LON = 80.2140


# ========================================================
# FLOOD POLYGONS
#
# Same FloodTwin scenario geometry used by the
# flood prediction service/frontend.
# Longitude first, latitude second.
# ========================================================

FLOOD_POLYGONS = {
    0: [
        [80.2210, 12.9815],
        [80.2230, 12.9810],
        [80.2242, 12.9820],
        [80.2234, 12.9832],
        [80.2214, 12.9830],
        [80.2210, 12.9815],
    ],

    30: [
        [80.2202, 12.9808],
        [80.2230, 12.9800],
        [80.2250, 12.9810],
        [80.2253, 12.9833],
        [80.2233, 12.9843],
        [80.2207, 12.9835],
        [80.2202, 12.9808],
    ],

    60: [
        [80.2188, 12.9800],
        [80.2222, 12.9790],
        [80.2255, 12.9803],
        [80.2264, 12.9835],
        [80.2238, 12.9855],
        [80.2201, 12.9847],
        [80.2188, 12.9800],
    ],

    90: [
        [80.2178, 12.9790],
        [80.2215, 12.9778],
        [80.2260, 12.9792],
        [80.2275, 12.9837],
        [80.2245, 12.9863],
        [80.2190, 12.9853],
        [80.2178, 12.9790],
    ],

    180: [
        [80.2194, 12.9800],
        [80.2224, 12.9793],
        [80.2256, 12.9805],
        [80.2260, 12.9836],
        [80.2234, 12.9850],
        [80.2200, 12.9840],
        [80.2194, 12.9800],
    ],
}


# ========================================================
# ROUTING CONFIGURATION
# ========================================================

# Large enough to strongly discourage R12,
# but not so large that routing becomes impossible.

R12_PENALTY_SECONDS = 7200.0

# Approx. 10-15 metre geographic buffer for this
# prototype study area.

R12_BUFFER_DEGREES = 0.00012


# ========================================================
# GRAPH CACHE
# ========================================================

@lru_cache(maxsize=1)
def _load_road_graph():
    """
    Load the cached Velachery OSM driving graph once.

    The graph was created by:
        scripts/build_road_graph.py
    """

    if not GRAPH_PATH.exists():
        raise FileNotFoundError(
            "Velachery road graph was not found at "
            f"{GRAPH_PATH}. Run "
            "'python scripts\\build_road_graph.py' first."
        )

    graph = ox.io.load_graphml(
        GRAPH_PATH
    )

    return graph


# ========================================================
# REQUEST HELPERS
# ========================================================

def _get_number(
    request: RouteRequest,
    *names: str,
    default: float,
) -> float:
    """
    Safely support slightly different schema field names.
    """

    for name in names:
        value = getattr(
            request,
            name,
            None,
        )

        if value is None:
            continue

        try:
            return float(value)

        except (
            TypeError,
            ValueError,
        ):
            continue

    return float(default)


def _get_text(
    request: RouteRequest,
    *names: str,
    default: str,
) -> str:
    for name in names:
        value = getattr(
            request,
            name,
            None,
        )

        if (
            isinstance(
                value,
                str,
            )
            and value.strip()
        ):
            return value.strip()

    return default


# ========================================================
# BASIC HELPERS
# ========================================================

def _float_value(
    value: Any,
    default: float = 0.0,
) -> float:
    try:
        return float(value)

    except (
        TypeError,
        ValueError,
    ):
        return default


def _same_coordinate(
    a: list[float],
    b: list[float],
) -> bool:
    if (
        len(a) < 2
        or len(b) < 2
    ):
        return False

    return (
        abs(a[0] - b[0]) < 1e-10
        and abs(a[1] - b[1]) < 1e-10
    )


# ========================================================
# EDGE HELPERS
# ========================================================

def _best_edge_data(
    graph,
    u,
    v,
    weight_attribute: str,
) -> dict:
    """
    Pick the best parallel OSM edge between
    two route nodes.
    """

    edge_map = graph.get_edge_data(
        u,
        v,
    )

    if not edge_map:
        return {}

    # MultiDiGraph:
    #
    # {
    #   key_1: {...attributes...},
    #   key_2: {...attributes...}
    # }

    if all(
        isinstance(
            item,
            dict,
        )
        for item
        in edge_map.values()
    ):
        return min(
            edge_map.values(),
            key=lambda data: (
                _float_value(
                    data.get(
                        weight_attribute
                    ),
                    float("inf"),
                )
            ),
        )

    return edge_map


def _edge_geometry(
    graph,
    u,
    v,
    data: dict,
) -> LineString:
    """
    Return a Shapely LineString for an OSM edge.
    """

    geometry = data.get(
        "geometry"
    )

    if (
        geometry is not None
        and isinstance(
            geometry,
            LineString,
        )
    ):
        return geometry

    u_node = graph.nodes[u]
    v_node = graph.nodes[v]

    return LineString(
        [
            (
                float(
                    u_node["x"]
                ),
                float(
                    u_node["y"]
                ),
            ),
            (
                float(
                    v_node["x"]
                ),
                float(
                    v_node["y"]
                ),
            ),
        ]
    )


# ========================================================
# ROUTE → COORDINATES
# ========================================================

def _route_to_coordinates(
    graph,
    route_nodes: list,
    weight_attribute: str,
) -> list[list[float]]:
    """
    Convert a NetworkX node route into detailed
    OSM road geometry.

    This is the part that stops the frontend from
    drawing straight airplane-style lines.
    """

    coordinates: list[
        list[float]
    ] = []

    for u, v in zip(
        route_nodes[:-1],
        route_nodes[1:],
    ):
        edge_data = (
            _best_edge_data(
                graph,
                u,
                v,
                weight_attribute,
            )
        )

        geometry = (
            _edge_geometry(
                graph,
                u,
                v,
                edge_data,
            )
        )

        edge_coordinates = [
            [
                float(lon),
                float(lat),
            ]
            for lon, lat
            in geometry.coords
        ]

        # ------------------------------------------------
        # MAKE SURE EDGE GEOMETRY FOLLOWS U → V
        # ------------------------------------------------

        u_lon = float(
            graph.nodes[u]["x"]
        )

        u_lat = float(
            graph.nodes[u]["y"]
        )

        first = (
            edge_coordinates[0]
        )

        last = (
            edge_coordinates[-1]
        )

        first_distance = (
            (
                first[0]
                - u_lon
            )
            ** 2
            +
            (
                first[1]
                - u_lat
            )
            ** 2
        )

        last_distance = (
            (
                last[0]
                - u_lon
            )
            ** 2
            +
            (
                last[1]
                - u_lat
            )
            ** 2
        )

        if (
            last_distance
            < first_distance
        ):
            edge_coordinates.reverse()

        # ------------------------------------------------
        # JOIN EDGES WITHOUT DUPLICATING JUNCTIONS
        # ------------------------------------------------

        for coordinate in (
            edge_coordinates
        ):
            if (
                coordinates
                and _same_coordinate(
                    coordinates[-1],
                    coordinate,
                )
            ):
                continue

            coordinates.append(
                coordinate
            )

    return coordinates


# ========================================================
# ROUTE METRICS
# ========================================================

def _route_metrics(
    graph,
    route_nodes: list,
    weight_attribute: str,
) -> tuple[float, int]:
    total_length_m = 0.0

    total_time_seconds = 0.0

    for u, v in zip(
        route_nodes[:-1],
        route_nodes[1:],
    ):
        edge_data = (
            _best_edge_data(
                graph,
                u,
                v,
                weight_attribute,
            )
        )

        total_length_m += (
            _float_value(
                edge_data.get(
                    "length"
                ),
                0.0,
            )
        )

        total_time_seconds += (
            _float_value(
                edge_data.get(
                    "travel_time"
                ),
                0.0,
            )
        )

    distance_km = round(
        total_length_m / 1000.0,
        2,
    )

    duration_min = max(
        1,
        round(
            total_time_seconds
            / 60.0
        ),
    )

    return (
        distance_km,
        duration_min,
    )


# ========================================================
# FLOOD POLYGON
# ========================================================

def _get_flood_polygon(
    request: RouteRequest,
) -> Polygon:
    forecast_minutes = int(
        _get_number(
            request,
            "forecast_minutes",
            default=60,
        )
    )

    coordinates = (
        FLOOD_POLYGONS.get(
            forecast_minutes,
            FLOOD_POLYGONS[60],
        )
    )

    return Polygon(
        coordinates
    )


# ========================================================
# R12 DEMO CORRIDOR
# ========================================================

def _build_r12_corridor(
    fastest_line: LineString,
) -> LineString:
    """
    R12 is a FloodTwin prototype road identifier.

    Instead of drawing an arbitrary straight line through
    buildings, define its threatened corridor as a central
    portion of the actual fastest road route.

    This means R12 itself is now road-network constrained.
    """

    if (
        fastest_line.is_empty
        or fastest_line.length <= 0
    ):
        return fastest_line

    start_distance = (
        fastest_line.length
        * 0.30
    )

    end_distance = (
        fastest_line.length
        * 0.62
    )

    corridor = substring(
        fastest_line,
        start_distance,
        end_distance,
    )

    if isinstance(
        corridor,
        LineString,
    ):
        return corridor

    return fastest_line


# ========================================================
# FLOOD PENALTY
# ========================================================

def _flood_penalty_seconds(
    request: RouteRequest,
) -> float:
    risk = _get_text(
        request,
        "flood_risk",
        default="SEVERE",
    ).upper()

    depth = _get_number(
        request,
        "flood_depth_cm",
        default=42,
    )

    if (
        risk == "SEVERE"
        or depth >= 40
    ):
        return 1500.0

    if (
        risk == "HIGH"
        or depth >= 25
    ):
        return 750.0

    if depth >= 10:
        return 240.0

    return 60.0


# ========================================================
# BUILD SAFE-WEIGHT GRAPH
# ========================================================

def _build_safe_graph(
    graph,
    request: RouteRequest,
    flood_polygon: Polygon,
    r12_corridor: LineString,
):
    """
    Every candidate edge stays on the OSM road network.

    We modify its cost instead of inventing new geometry.

    travel_time
        +
    flood penalty
        +
    R12 penalty
    """

    safe_graph = graph.copy()

    flood_penalty = (
        _flood_penalty_seconds(
            request
        )
    )

    r12_area = (
        r12_corridor.buffer(
            R12_BUFFER_DEGREES
        )
    )

    for (
        u,
        v,
        key,
        data,
    ) in safe_graph.edges(
        keys=True,
        data=True,
    ):
        edge_line = (
            _edge_geometry(
                safe_graph,
                u,
                v,
                data,
            )
        )

        base_time = max(
            _float_value(
                data.get(
                    "travel_time"
                ),
                1.0,
            ),
            1.0,
        )

        safe_weight = (
            base_time
        )

        # ------------------------------------------------
        # FUTURE FLOOD EXPOSURE
        # ------------------------------------------------

        if edge_line.intersects(
            flood_polygon
        ):
            safe_weight += (
                flood_penalty
            )

            data[
                "flood_exposed"
            ] = True

        else:
            data[
                "flood_exposed"
            ] = False

        # ------------------------------------------------
        # R12 RESTRICTION
        # ------------------------------------------------

        if (
            not r12_area.is_empty
            and edge_line.intersects(
                r12_area
            )
        ):
            safe_weight += (
                R12_PENALTY_SECONDS
            )

            data[
                "intersects_r12"
            ] = True

        else:
            data[
                "intersects_r12"
            ] = False

        data[
            "safe_weight"
        ] = safe_weight

    return safe_graph


# ========================================================
# ROUTE INTERSECTION CHECKS
# ========================================================

def _route_intersects_flood(
    route_line: LineString,
    flood_polygon: Polygon,
) -> bool:
    if (
        route_line.is_empty
        or flood_polygon.is_empty
    ):
        return False

    return route_line.intersects(
        flood_polygon
    )


def _route_intersects_r12(
    route_line: LineString,
    r12_corridor: LineString,
) -> bool:
    if (
        route_line.is_empty
        or r12_corridor.is_empty
    ):
        return False

    return route_line.intersects(
        r12_corridor.buffer(
            R12_BUFFER_DEGREES
        )
    )


# ========================================================
# EXPOSURE TEXT
# ========================================================

def _exposure_message(
    *,
    flood: bool,
    r12: bool,
    safe: bool,
) -> str:
    if safe:
        if flood and r12:
            return (
                "Road-network route reduces overall flood "
                "exposure but still encounters constrained "
                "segments near the flood zone and R12."
            )

        if flood:
            return (
                "Road-network route minimizes predicted "
                "flood exposure. Initial flood contact may "
                "remain because the evacuation origin lies "
                "inside the affected zone."
            )

        if r12:
            return (
                "Route avoids the main flood footprint but "
                "retains limited exposure near the R12 "
                "corridor."
            )

        return (
            "Road-network route avoids the threatened R12 "
            "corridor and minimizes predicted flood exposure."
        )

    if flood and r12:
        return (
            "Fastest road route intersects the predicted "
            "flood zone and threatened R12 corridor."
        )

    if flood:
        return (
            "Fastest road route intersects predicted "
            "flood-affected road segments."
        )

    if r12:
        return (
            "Fastest road route uses the threatened "
            "R12 corridor."
        )

    return (
        "Fastest road route currently has low "
        "identified flood exposure."
    )


# ========================================================
# ROUTE SERVICE
# ========================================================

def generate_safe_routes(
    request: RouteRequest,
) -> SafeRouteResponse:
    graph = _load_road_graph()

    # ----------------------------------------------------
    # REQUEST LOCATIONS
    # ----------------------------------------------------

    origin_lat = _get_number(
        request,
        "origin_lat",
        "origin_latitude",
        default=DEFAULT_ORIGIN_LAT,
    )

    origin_lon = _get_number(
        request,
        "origin_lon",
        "origin_longitude",
        default=DEFAULT_ORIGIN_LON,
    )

    destination_lat = (
        _get_number(
            request,
            "destination_lat",
            "destination_latitude",
            default=(
                DEFAULT_DESTINATION_LAT
            ),
        )
    )

    destination_lon = (
        _get_number(
            request,
            "destination_lon",
            "destination_longitude",
            default=(
                DEFAULT_DESTINATION_LON
            ),
        )
    )

    # ----------------------------------------------------
    # SNAP TO REAL DRIVABLE ROADS
    # ----------------------------------------------------

    origin_node = (
        ox.distance.nearest_nodes(
            graph,
            X=origin_lon,
            Y=origin_lat,
        )
    )

    destination_node = (
        ox.distance.nearest_nodes(
            graph,
            X=destination_lon,
            Y=destination_lat,
        )
    )

    # ----------------------------------------------------
    # 1. FASTEST ROAD ROUTE
    # ----------------------------------------------------

    fastest_nodes = (
        nx.shortest_path(
            graph,
            source=origin_node,
            target=destination_node,
            weight="travel_time",
        )
    )

    fastest_coordinates = (
        _route_to_coordinates(
            graph,
            fastest_nodes,
            "travel_time",
        )
    )

    fastest_line = LineString(
        fastest_coordinates
    )

    (
        fastest_distance,
        fastest_duration,
    ) = _route_metrics(
        graph,
        fastest_nodes,
        "travel_time",
    )

    # ----------------------------------------------------
    # FLOOD + R12 HAZARDS
    # ----------------------------------------------------

    flood_polygon = (
        _get_flood_polygon(
            request
        )
    )

    r12_corridor = (
        _build_r12_corridor(
            fastest_line
        )
    )

    # ----------------------------------------------------
    # 2. FLOOD-SAFE ROAD GRAPH
    # ----------------------------------------------------

    safe_graph = (
        _build_safe_graph(
            graph,
            request,
            flood_polygon,
            r12_corridor,
        )
    )

    # ----------------------------------------------------
    # SAFE ROUTE
    # ----------------------------------------------------

    try:
        safe_nodes = (
            nx.shortest_path(
                safe_graph,
                source=origin_node,
                target=destination_node,
                weight="safe_weight",
            )
        )

    except nx.NetworkXNoPath:
        # Extremely defensive fallback.
        # Still follows real OSM roads.

        safe_nodes = (
            fastest_nodes
        )

    safe_coordinates = (
        _route_to_coordinates(
            safe_graph,
            safe_nodes,
            "safe_weight",
        )
    )

    safe_line = LineString(
        safe_coordinates
    )

    (
        safe_distance,
        safe_duration,
    ) = _route_metrics(
        safe_graph,
        safe_nodes,
        "safe_weight",
    )

    # ----------------------------------------------------
    # REAL INTERSECTION ANALYSIS
    # ----------------------------------------------------

    fastest_flood = (
        _route_intersects_flood(
            fastest_line,
            flood_polygon,
        )
    )

    fastest_r12 = (
        _route_intersects_r12(
            fastest_line,
            r12_corridor,
        )
    )

    safe_flood = (
        _route_intersects_flood(
            safe_line,
            flood_polygon,
        )
    )

    safe_r12 = (
        _route_intersects_r12(
            safe_line,
            r12_corridor,
        )
    )

    # ----------------------------------------------------
    # RISK STATUS
    # ----------------------------------------------------

    flood_risk = (
        _get_text(
            request,
            "flood_risk",
            default="SEVERE",
        )
        .upper()
    )

    flood_depth = (
        _get_number(
            request,
            "flood_depth_cm",
            default=42,
        )
    )

    if (
        flood_risk == "SEVERE"
        or flood_depth >= 40
        or fastest_flood
        or fastest_r12
    ):
        fastest_status = (
            "UNSAFE"
        )

    elif (
        flood_risk == "HIGH"
        or flood_depth >= 25
    ):
        fastest_status = (
            "HIGH_EXPOSURE"
        )

    else:
        fastest_status = (
            "MONITOR"
        )

    if (
        flood_risk
        in {
            "HIGH",
            "SEVERE",
        }
    ):
        safe_status = (
            "RECOMMENDED"
        )

    else:
        safe_status = (
            "PREFERRED"
        )

    # ----------------------------------------------------
    # RESPONSE OBJECTS
    # ----------------------------------------------------

    fastest_route = RouteOption(
        route_id="FASTEST",

        name="Fastest Route",

        distance_km=(
            fastest_distance
        ),

        duration_min=(
            fastest_duration
        ),

        safety_status=(
            fastest_status
        ),

        flood_exposure=(
            _exposure_message(
                flood=(
                    fastest_flood
                ),
                r12=(
                    fastest_r12
                ),
                safe=False,
            )
        ),

        intersects_flood_zone=(
            fastest_flood
        ),

        intersects_r12=(
            fastest_r12
        ),

        geometry=RouteGeometry(
            coordinates=(
                fastest_coordinates
            ),
        ),
    )

    safe_route = RouteOption(
        route_id="FLOOD_SAFE",

        name="Flood-Safe Route",

        distance_km=(
            safe_distance
        ),

        duration_min=(
            safe_duration
        ),

        safety_status=(
            safe_status
        ),

        flood_exposure=(
            _exposure_message(
                flood=(
                    safe_flood
                ),
                r12=(
                    safe_r12
                ),
                safe=True,
            )
        ),

        intersects_flood_zone=(
            safe_flood
        ),

        intersects_r12=(
            safe_r12
        ),

        geometry=RouteGeometry(
            coordinates=(
                safe_coordinates
            ),
        ),
    )

    # ----------------------------------------------------
    # DIFFERENCE
    # ----------------------------------------------------

    additional_distance = round(
        max(
            safe_distance
            - fastest_distance,
            0.0,
        ),
        2,
    )

    additional_time = max(
        safe_duration
        - fastest_duration,
        0,
    )

    # ----------------------------------------------------
    # RESPONSE
    # ----------------------------------------------------

    return SafeRouteResponse(
        zone_id=(
            request.zone_id
        ),

        destination_id=(
            request.destination_id
        ),

        forecast_minutes=(
            request.forecast_minutes
        ),

        fastest_route=(
            fastest_route
        ),

        safe_route=(
            safe_route
        ),

        recommended_route_id=(
            "FLOOD_SAFE"
        ),

        additional_distance_km=(
            additional_distance
        ),

        additional_time_min=(
            additional_time
        ),

        decision_reason=(
            "FloodTwin compared two routes on the "
            "OpenStreetMap drivable road network. "
            "The flood-safe route increases the cost "
            "of road edges exposed to forecast flooding "
            "and the threatened R12 corridor, producing "
            "a road-constrained lower-exposure alternative."
        ),

        data_mode="demo",
    )