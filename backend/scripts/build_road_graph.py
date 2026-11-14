from pathlib import Path

import osmnx as ox


# =========================================================
# PATHS
# =========================================================

BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = BACKEND_ROOT / "data"

GRAPH_PATH = DATA_DIR / "velachery_drive.graphml"


# =========================================================
# VELACHERY STUDY AREA
# OSMnx 2.x bbox order:
#
# (left, bottom, right, top)
# (west, south, east, north)
# =========================================================

VELACHERY_BBOX = (
    80.20873,  # west
    12.96867,  # south
    80.23638,  # east
    12.99562,  # north
)


# =========================================================
# BUILD GRAPH
# =========================================================

def main() -> None:
    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    print(
        "Downloading Velachery driving network from OpenStreetMap..."
    )

    graph = ox.graph.graph_from_bbox(
        VELACHERY_BBOX,
        network_type="drive",
        simplify=True,
        retain_all=False,
    )

    print(
        f"Downloaded {len(graph.nodes):,} nodes and "
        f"{len(graph.edges):,} road edges."
    )

    # -----------------------------------------------------
    # ADD SPEED ESTIMATES
    # -----------------------------------------------------

    graph = ox.routing.add_edge_speeds(
        graph,
        fallback=30,
    )

    # -----------------------------------------------------
    # ADD FREE-FLOW TRAVEL TIME
    # -----------------------------------------------------

    graph = ox.routing.add_edge_travel_times(
        graph,
    )

    # -----------------------------------------------------
    # SAVE FOR OFFLINE / FAST REUSE
    # -----------------------------------------------------

    ox.io.save_graphml(
        graph,
        filepath=GRAPH_PATH,
    )

    print()
    print(
        "Road graph successfully saved:"
    )

    print(
        GRAPH_PATH
    )


if __name__ == "__main__":
    main()