import csv
import time
from pathlib import Path

from ml.model1 import predict_flood


ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = (
    ROOT
    / "data"
    / "ml_context"
    / "chennai_location_features.csv"
)


def main():

    print("Starting Model 1 diagnostic...", flush=True)

    # Read exactly ONE Chennai GIS location.
    with DATA_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        row = next(csv.DictReader(file), None)

    if row is None:
        raise ValueError("Chennai GIS dataset is empty.")

    def feature(name):
        value = row.get(name)

        if value is None or not value.strip():
            raise ValueError(f"Missing GIS feature: {name}")

        return float(value)

    # Controlled test rainfall, not actual weather.
    payload = {
        "rainfall_mm_hr": 10.0,
        "recent_rainfall_mm": 20.0,
        "antecedent_rainfall_mm": 30.0,

        "elevation_m": feature("elevation_m"),
        "slope_deg": feature("slope_deg"),

        "built_up_percent": feature(
            "built_up_percent"
        ),

        "distance_to_nearest_drain_m": feature(
            "distance_to_nearest_drain_m"
        ),

        "drain_density_m_per_km2": feature(
            "drain_density_m_per_km2"
        ),

        "previous_depth_cm": feature(
            "observed_reference_depth_cm"
        ),
    }

    print(
        "Testing location:",
        row.get("location_id"),
        flush=True
    )

    print("Loading model and predicting...", flush=True)

    start = time.perf_counter()

    result = predict_flood(
        payload,
        horizons=[60]
    )

    elapsed = time.perf_counter() - start

    print("\nMODEL 1 TEST SUCCESS")
    print("Execution time:", round(elapsed, 2), "seconds")
    print("Prediction:", result["predictions"][0])


if __name__ == "__main__":
    main()