"""Prepare the historic Rötgesmarkt location data for map imports."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPOSITORY_ROOT / "content/locations/roetgesmarkt_input.geojson"
DEFAULT_GEOJSON_OUTPUT = REPOSITORY_ROOT / "generated/roetgesmarkt_upload.geojson"
DEFAULT_CSV_OUTPUT = (
    REPOSITORY_ROOT / "generated/roetgesmarkt_upload_google_maps.csv"
)


def looks_like_lat_lon(coordinates: Any) -> bool:
    """Return whether a coordinate pair appears to use latitude, longitude."""
    if not isinstance(coordinates, list) or len(coordinates) != 2:
        return False

    first, second = coordinates
    return (
        isinstance(first, (int, float))
        and isinstance(second, (int, float))
        and 45 <= first <= 60
        and 5 <= second <= 15
    )


def fix_feature(feature: dict[str, Any]) -> dict[str, Any]:
    """Normalize a point feature and remove generated identifiers."""
    geometry = feature.get("geometry")
    if geometry:
        coordinates = geometry.get("coordinates")
        if geometry.get("type") == "Point" and looks_like_lat_lon(coordinates):
            geometry["coordinates"] = [coordinates[1], coordinates[0]]

    feature.pop("id", None)
    return feature


def export_to_csv(features: list[dict[str, Any]], filename: Path) -> None:
    """Export point features to a Google My Maps compatible CSV."""
    filename.parent.mkdir(parents=True, exist_ok=True)
    with filename.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file)
        writer.writerow(["Name", "Latitude", "Longitude"])

        for feature in features:
            geometry = feature.get("geometry", {})
            properties = feature.get("properties", {})
            coordinates = geometry.get("coordinates", [])

            if geometry.get("type") != "Point" or len(coordinates) != 2:
                continue

            longitude, latitude = coordinates
            if latitude == 0 and longitude == 0:
                continue

            writer.writerow([properties.get("name", ""), latitude, longitude])


def transform(input_file: Path, geojson_output: Path, csv_output: Path) -> None:
    """Transform the source FeatureCollection and write both exports."""
    with input_file.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if data.get("type") != "FeatureCollection":
        raise ValueError("Input must be a GeoJSON FeatureCollection")

    features = [fix_feature(feature) for feature in data.get("features", [])]
    data["features"] = features

    geojson_output.parent.mkdir(parents=True, exist_ok=True)
    with geojson_output.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    export_to_csv(features, csv_output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--geojson-output", type=Path, default=DEFAULT_GEOJSON_OUTPUT)
    parser.add_argument("--csv-output", type=Path, default=DEFAULT_CSV_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    transform(args.input, args.geojson_output, args.csv_output)
    print(f"GeoJSON export saved to: {args.geojson_output}")
    print(f"CSV export saved to: {args.csv_output}")


if __name__ == "__main__":
    main()
