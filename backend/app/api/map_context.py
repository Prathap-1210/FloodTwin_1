from pathlib import Path
import json

import networkx as nx
import osmnx as ox

from fastapi import APIRouter


router = APIRouter(
    prefix="/map",
    tags=["Map Context"],
)


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

MAP_DIR = (
    BACKEND_ROOT
    / "data"
    / "map_context"
)

GRAPH_PATH = (
    BACKEND_ROOT
    / "data"
    / "velachery_drive.graphml"
)


def empty_geojson():
    return {
        "type": "FeatureCollection",
        "features": [],
    }


def load_geojson(
    filename: str,
):
    path = MAP_DIR / filename

    if not path.exists():
        return empty_geojson()

    return json.loads(
        path.read_text(
            encoding="utf-8"
        )
    )


def build_real_critical_road():
    """
    Prototype R12, but its geometry follows
    actual OpenStreetMap roads.
    """

    if not GRAPH_PATH.exists():
        return empty_geojson()

    graph = ox.io.load_graphml(
        GRAPH_PATH
    )

    origin = ox.distance.nearest_nodes(
        graph,
        X=80.2224,
        Y=12.9823,
    )

    destination = ox.distance.nearest_nodes(
        graph,
        X=80.2140,
        Y=12.9900,
    )

    route = nx.shortest_path(
        graph,
        origin,
        destination,
        weight="travel_time",
    )

    coordinates = []

    for u, v in zip(
        route[:-1],
        route[1:],
    ):
        edge_map = graph.get_edge_data(
            u,
            v,
        )

        if not edge_map:
            continue

        edge = min(
            edge_map.values(),
            key=lambda data: float(
                data.get(
                    "travel_time",
                    999999,
                )
            ),
        )

        geometry = edge.get(
            "geometry"
        )

        if geometry is not None:
            edge_coords = [
                [float(x), float(y)]
                for x, y
                in geometry.coords
            ]
        else:
            edge_coords = [
                [
                    float(
                        graph.nodes[u]["x"]
                    ),
                    float(
                        graph.nodes[u]["y"]
                    ),
                ],
                [
                    float(
                        graph.nodes[v]["x"]
                    ),
                    float(
                        graph.nodes[v]["y"]
                    ),
                ],
            ]

        if coordinates:
            if (
                coordinates[-1]
                == edge_coords[0]
            ):
                edge_coords = (
                    edge_coords[1:]
                )

        coordinates.extend(
            edge_coords
        )

    # Use a central section of the real road route
    # as prototype critical corridor R12.

    start = int(
        len(coordinates) * 0.30
    )

    end = int(
        len(coordinates) * 0.62
    )

    r12_coordinates = (
        coordinates[start:end]
    )

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",

                "properties": {
                    "road_id": "R12",
                    "risk": "HIGH",
                    "source": (
                        "OpenStreetMap road graph"
                    ),
                },

                "geometry": {
                    "type": "LineString",
                    "coordinates": (
                        r12_coordinates
                    ),
                },
            }
        ],
    }


@router.get("/context")
def get_map_context():
    healthcare = load_geojson(
        "healthcare.geojson"
    )

    shelters = load_geojson(
        "candidate_shelters.geojson"
    )

    drainage = load_geojson(
        "drainage.geojson"
    )

    critical_road = (
        build_real_critical_road()
    )

    return {
        "healthcare": healthcare,

        "candidate_shelters": shelters,

        "drainage": drainage,

        "critical_road": (
            critical_road
        ),

        "counts": {
            "healthcare": len(
                healthcare.get(
                    "features",
                    [],
                )
            ),

            "candidate_shelters": len(
                shelters.get(
                    "features",
                    [],
                )
            ),

            "drainage": len(
                drainage.get(
                    "features",
                    [],
                )
            ),
        },

        "data_source": (
            "OpenStreetMap cached geospatial context"
        ),
    }