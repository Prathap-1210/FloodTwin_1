from pathlib import Path
import json

import osmnx as ox


BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = BACKEND_ROOT / "data" / "map_context"

DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# Velachery
# west, south, east, north
BBOX = (
    80.20873,
    12.96867,
    80.23638,
    12.99562,
)


def save_geojson(
    gdf,
    filename: str,
):
    path = DATA_DIR / filename

    if gdf is None or gdf.empty:
        path.write_text(
            json.dumps(
                {
                    "type": "FeatureCollection",
                    "features": [],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        print(
            f"{filename}: 0 features"
        )

        return

    gdf = gdf.copy()

    gdf = gdf.reset_index()

    path.write_text(
        gdf.to_json(),
        encoding="utf-8",
    )

    print(
        f"{filename}: {len(gdf)} features"
    )


def pointify(
    gdf,
):
    """
    Convert hospital/shelter polygons into a
    representative point so the frontend can
    display an accurate marker.
    """

    if gdf.empty:
        return gdf

    gdf = gdf.copy()

    gdf["geometry"] = (
        gdf.geometry.apply(
            lambda geometry:
                geometry
                if geometry.geom_type
                == "Point"
                else geometry.representative_point()
        )
    )

    return gdf


def main():
    print()
    print(
        "Downloading real Velachery map context..."
    )
    print()

    # ====================================================
    # HOSPITALS / CLINICS
    # ====================================================

    healthcare = (
        ox.features.features_from_bbox(
            BBOX,
            {
                "amenity": [
                    "hospital",
                    "clinic",
                    "doctors",
                ],
            },
        )
    )

    healthcare = pointify(
        healthcare
    )

    save_geojson(
        healthcare,
        "healthcare.geojson",
    )

    # ====================================================
    # CANDIDATE EVACUATION SHELTERS
    #
    # IMPORTANT:
    # These are candidate facilities,
    # NOT claimed as official government camps.
    # ====================================================

    shelters = (
        ox.features.features_from_bbox(
            BBOX,
            {
                "amenity": [
                    "school",
                    "college",
                    "community_centre",
                    "townhall",
                ],
            },
        )
    )

    shelters = pointify(
        shelters
    )

    save_geojson(
        shelters,
        "candidate_shelters.geojson",
    )

    # ====================================================
    # MAPPED DRAINAGE FEATURES
    # ====================================================

    drainage = (
        ox.features.features_from_bbox(
            BBOX,
            {
                "waterway": [
                    "drain",
                    "ditch",
                    "canal",
                ],
            },
        )
    )

    if not drainage.empty:
        drainage = drainage[
            drainage.geometry
            .geom_type
            .isin(
                [
                    "LineString",
                    "MultiLineString",
                ]
            )
        ]

    save_geojson(
        drainage,
        "drainage.geojson",
    )

    print()
    print(
        "Finished."
    )

    print(
        f"Saved to: {DATA_DIR}"
    )


if __name__ == "__main__":
    main()