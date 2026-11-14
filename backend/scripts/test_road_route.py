from pathlib import Path

import networkx as nx
import osmnx as ox


# =========================================================
# PATH
# =========================================================

BACKEND_ROOT = Path(__file__).resolve().parents[1]

GRAPH_PATH = (
    BACKEND_ROOT
    / "data"
    / "velachery_drive.graphml"
)


# =========================================================
# DEMO POINTS
# =========================================================

ORIGIN_LAT = 12.9823
ORIGIN_LON = 80.2224

CAMP_A_LAT = 12.9900
CAMP_A_LON = 80.2140


# =========================================================
# TEST ROUTING
# =========================================================

def main() -> None:
    print(
        "Loading Velachery road graph..."
    )

    graph = ox.io.load_graphml(
        GRAPH_PATH
    )

    print(
        "Finding nearest road nodes..."
    )

    origin_node = ox.distance.nearest_nodes(
        graph,
        X=ORIGIN_LON,
        Y=ORIGIN_LAT,
    )

    destination_node = ox.distance.nearest_nodes(
        graph,
        X=CAMP_A_LON,
        Y=CAMP_A_LAT,
    )

    print(
        f"Origin road node: {origin_node}"
    )

    print(
        f"Destination road node: {destination_node}"
    )

    route = nx.shortest_path(
        graph,
        source=origin_node,
        target=destination_node,
        weight="travel_time",
    )

    print()
    print(
        f"Road-following route contains {len(route)} nodes."
    )

    print(
        "First route nodes:"
    )

    for node_id in route[:10]:
        node = graph.nodes[
            node_id
        ]

        print(
            node_id,
            node["x"],
            node["y"],
        )


if __name__ == "__main__":
    main()  