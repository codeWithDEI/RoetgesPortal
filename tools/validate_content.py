"""Validate RötgesPortal content schemas and cross-file references."""

from __future__ import annotations

import json
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any

try:
    import yaml
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError as error:
    raise SystemExit(
        "Validation dependencies are missing. "
        "Run: python3 -m pip install -r requirements-dev.txt"
    ) from error


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
COLLECTIONS = {
    "topics": ("content/topics", "schemas/topic.schema.json"),
    "datasets": ("content/datasets", "schemas/dataset.schema.json"),
    "views": ("content/views", "schemas/view.schema.json"),
}


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        document = yaml.safe_load(file)

    if not isinstance(document, dict):
        raise ValueError("the document root must be a mapping")
    return document


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        document = json.load(file)

    if not isinstance(document, dict):
        raise ValueError("the document root must be an object")
    return document


def format_path(parts: Iterable[Any]) -> str:
    return ".".join(str(part) for part in parts) or "<root>"


def validate_collection(
    collection_name: str, directory: Path, schema_path: Path
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    documents: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    schema = load_json(schema_path)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    for path in sorted(directory.glob("*.yaml")):
        try:
            document = load_yaml(path)
        except (OSError, ValueError, yaml.YAMLError) as error:
            errors.append(f"{path.relative_to(REPOSITORY_ROOT)}: {error}")
            continue

        schema_errors = sorted(
            validator.iter_errors(document),
            key=lambda item: tuple(str(part) for part in item.path),
        )
        for error in schema_errors:
            location = format_path(error.absolute_path)
            errors.append(
                f"{path.relative_to(REPOSITORY_ROOT)}:{location}: {error.message}"
            )

        document_id = document.get("id")
        if not isinstance(document_id, str):
            continue
        if document_id != path.stem:
            errors.append(
                f"{path.relative_to(REPOSITORY_ROOT)}: id must match the file name"
            )
        if document_id in documents:
            errors.append(
                f"{path.relative_to(REPOSITORY_ROOT)}: duplicate {collection_name} "
                f"id '{document_id}'"
            )
        documents[document_id] = document

    return documents, errors


def resolve_repository_path(value: str) -> Path | None:
    candidate = (REPOSITORY_ROOT / value).resolve()
    if not candidate.is_relative_to(REPOSITORY_ROOT):
        return None
    return candidate


def validate_dataset_paths(datasets: dict[str, dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    for dataset_id, dataset in datasets.items():
        value = dataset.get("path")
        if not isinstance(value, str):
            continue
        path = resolve_repository_path(value)
        if path is None:
            errors.append(f"dataset '{dataset_id}': path escapes the repository")
            continue
        if not path.exists():
            errors.append(f"dataset '{dataset_id}': path does not exist: {value}")
            continue

        if dataset.get("type") == "geojson":
            try:
                geojson = load_json(path)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                errors.append(f"dataset '{dataset_id}': invalid GeoJSON: {error}")
                continue
            if geojson.get("type") != "FeatureCollection":
                errors.append(
                    f"dataset '{dataset_id}': GeoJSON must be a FeatureCollection"
                )
    return errors


def validate_topic_paths(topics: dict[str, dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    for topic_id, topic in topics.items():
        locations = topic.get("locations", [])
        if not isinstance(locations, list):
            continue
        for location in locations:
            if not isinstance(location, dict):
                continue
            value = location.get("geoJsonFile")
            if not isinstance(value, str):
                continue
            path = resolve_repository_path(value)
            if path is None or not path.is_file():
                errors.append(
                    f"topic '{topic_id}': location file does not exist: {value}"
                )
    return errors


def validate_views(
    views: dict[str, dict[str, Any]], datasets: dict[str, dict[str, Any]]
) -> list[str]:
    errors: list[str] = []
    routes: dict[str, str] = {}

    for view_id, view in views.items():
        route = view.get("route")
        if isinstance(route, str):
            if route in routes:
                errors.append(
                    f"view '{view_id}': route '{route}' is already used by "
                    f"view '{routes[route]}'"
                )
            routes[route] = view_id

        map_config = view.get("map", {})
        if not isinstance(map_config, dict):
            continue
        zoom = map_config.get("zoom")
        min_zoom = map_config.get("minZoom", zoom)
        max_zoom = map_config.get("maxZoom", zoom)
        if all(isinstance(value, int) for value in (min_zoom, zoom, max_zoom)):
            if not min_zoom <= zoom <= max_zoom:
                errors.append(
                    f"view '{view_id}': expected minZoom <= zoom <= maxZoom"
                )

        layer_ids: set[str] = set()
        layers = view.get("layers", [])
        if not isinstance(layers, list):
            continue
        for layer in layers:
            if not isinstance(layer, dict):
                continue
            layer_id = layer.get("id")
            if isinstance(layer_id, str):
                if layer_id in layer_ids:
                    errors.append(
                        f"view '{view_id}': duplicate layer id '{layer_id}'"
                    )
                layer_ids.add(layer_id)

            dataset_id = layer.get("dataset")
            if not isinstance(dataset_id, str):
                continue
            dataset = datasets.get(dataset_id)
            if dataset is None:
                errors.append(
                    f"view '{view_id}', layer '{layer_id}': unknown dataset "
                    f"'{dataset_id}'"
                )
                continue
            if "filter" in layer and dataset.get("type") != "topics":
                errors.append(
                    f"view '{view_id}', layer '{layer_id}': topic filters require "
                    "a topics dataset"
                )

    return errors


def main() -> None:
    all_documents: dict[str, dict[str, dict[str, Any]]] = {}
    errors: list[str] = []

    for name, (directory, schema) in COLLECTIONS.items():
        documents, collection_errors = validate_collection(
            name,
            REPOSITORY_ROOT / directory,
            REPOSITORY_ROOT / schema,
        )
        all_documents[name] = documents
        errors.extend(collection_errors)

    errors.extend(validate_dataset_paths(all_documents["datasets"]))
    errors.extend(validate_topic_paths(all_documents["topics"]))
    errors.extend(
        validate_views(all_documents["views"], all_documents["datasets"])
    )

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)

    counts = ", ".join(
        f"{len(documents)} {name}" for name, documents in all_documents.items()
    )
    print(f"Content validation passed: {counts}")


if __name__ == "__main__":
    main()
