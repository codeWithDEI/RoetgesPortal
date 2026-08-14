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
    "areas": ("content/areas", "schemas/area.schema.json"),
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
    collection_name: str,
    directory: Path,
    schema_path: Path,
    repository_root: Path = REPOSITORY_ROOT,
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
            errors.append(f"{path.relative_to(repository_root)}: {error}")
            continue

        schema_errors = sorted(
            validator.iter_errors(document),
            key=lambda item: tuple(str(part) for part in item.path),
        )
        for error in schema_errors:
            location = format_path(error.absolute_path)
            errors.append(
                f"{path.relative_to(repository_root)}:{location}: {error.message}"
            )

        document_id = document.get("id")
        if not isinstance(document_id, str):
            continue
        if document_id != path.stem:
            errors.append(
                f"{path.relative_to(repository_root)}: id must match the file name"
            )
        if document_id in documents:
            errors.append(
                f"{path.relative_to(repository_root)}: duplicate {collection_name} "
                f"id '{document_id}'"
            )
        documents[document_id] = document

    return documents, errors


def resolve_repository_path(
    value: str, repository_root: Path = REPOSITORY_ROOT
) -> Path | None:
    candidate = (repository_root / value).resolve()
    if not candidate.is_relative_to(repository_root):
        return None
    return candidate


def validate_dataset_paths(
    datasets: dict[str, dict[str, Any]],
    repository_root: Path = REPOSITORY_ROOT,
) -> list[str]:
    errors: list[str] = []
    for dataset_id, dataset in datasets.items():
        value = dataset.get("path")
        if not isinstance(value, str):
            continue
        path = resolve_repository_path(value, repository_root)
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


def validate_topic_paths(
    topics: dict[str, dict[str, Any]],
    repository_root: Path = REPOSITORY_ROOT,
) -> list[str]:
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
            path = resolve_repository_path(value, repository_root)
            if path is None or not path.is_file():
                errors.append(
                    f"topic '{topic_id}': location file does not exist: {value}"
                )
                continue
            try:
                geojson = load_json(path)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                errors.append(
                    f"topic '{topic_id}': invalid location GeoJSON: {error}"
                )
                continue
            if geojson.get("type") != "FeatureCollection":
                errors.append(
                    f"topic '{topic_id}': location GeoJSON must be a "
                    "FeatureCollection"
                )
    return errors


def validate_area_hierarchy(
    areas: dict[str, dict[str, Any]],
) -> list[str]:
    """Validate parent references and reject cycles in administrative areas."""
    errors: list[str] = []

    for area_id, area in areas.items():
        parent_id = area.get("parent")
        if not isinstance(parent_id, str):
            continue
        if parent_id not in areas:
            errors.append(f"area '{area_id}': unknown parent '{parent_id}'")
        elif parent_id == area_id:
            errors.append(f"area '{area_id}': cannot be its own parent")

    reported_cycles: set[tuple[str, ...]] = set()
    for area_id in areas:
        path: list[str] = []
        current_id: str | None = area_id
        while current_id is not None and current_id in areas:
            if current_id in path:
                cycle = path[path.index(current_id) :]
                normalized = tuple(sorted(cycle))
                if normalized not in reported_cycles:
                    errors.append(
                        "area hierarchy contains a cycle: "
                        + " -> ".join([*cycle, current_id])
                    )
                    reported_cycles.add(normalized)
                break
            path.append(current_id)
            parent = areas[current_id].get("parent")
            current_id = parent if isinstance(parent, str) else None

    return errors


def validate_topic_areas(
    topics: dict[str, dict[str, Any]],
    areas: dict[str, dict[str, Any]],
) -> list[str]:
    """Require every topic area reference to resolve to the area registry."""
    errors: list[str] = []
    for topic_id, topic in topics.items():
        for area_id in topic.get("areas", []):
            if isinstance(area_id, str) and area_id not in areas:
                errors.append(f"topic '{topic_id}': unknown area '{area_id}'")
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

        source_ids: set[str] = set()
        sources = view.get("sources", [])
        if not isinstance(sources, list):
            continue
        for source in sources:
            if not isinstance(source, dict):
                continue
            source_id = source.get("id")
            if not isinstance(source_id, str):
                continue
            if source_id in source_ids:
                errors.append(
                    f"view '{view_id}': duplicate source id '{source_id}'"
                )
            source_ids.add(source_id)

            dataset_id = source.get("dataset")
            if not isinstance(dataset_id, str):
                continue
            dataset = datasets.get(dataset_id)
            if dataset is None:
                errors.append(
                    f"view '{view_id}', source '{source_id}': unknown dataset "
                    f"'{dataset_id}'"
                )
                continue
            if (
                "filter" in source or "sort" in source
            ) and dataset.get("type") != "topics":
                errors.append(
                    f"view '{view_id}', source '{source_id}': filters and sorting "
                    "require a topics dataset"
                )

            sort_fields: set[str] = set()
            for rule in source.get("sort", []):
                if not isinstance(rule, dict):
                    continue
                field = rule.get("field")
                if not isinstance(field, str):
                    continue
                if field in sort_fields:
                    errors.append(
                        f"view '{view_id}', source '{source_id}': duplicate sort "
                        f"field '{field}'"
                    )
                sort_fields.add(field)

        presentation = view.get("presentation", {})
        if not isinstance(presentation, dict):
            continue
        presentation_type = presentation.get("type")
        if presentation_type == "list":
            source_id = presentation.get("source")
            if isinstance(source_id, str) and source_id not in source_ids:
                errors.append(
                    f"view '{view_id}': list presentation references unknown "
                    f"source '{source_id}'"
                )
            continue

        if presentation_type != "map":
            continue

        map_config = presentation.get("map", {})
        if isinstance(map_config, dict):
            zoom = map_config.get("zoom")
            min_zoom = map_config.get("minZoom", zoom)
            max_zoom = map_config.get("maxZoom", zoom)
            if all(
                isinstance(value, int) for value in (min_zoom, zoom, max_zoom)
            ) and not min_zoom <= zoom <= max_zoom:
                errors.append(
                    f"view '{view_id}': expected minZoom <= zoom <= maxZoom"
                )

        layer_ids: set[str] = set()
        layers = presentation.get("layers", [])
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

            source_id = layer.get("source")
            if isinstance(source_id, str) and source_id not in source_ids:
                errors.append(
                    f"view '{view_id}', layer '{layer_id}': unknown source "
                    f"'{source_id}'"
                )

    return errors


def validate_repository(
    repository_root: Path = REPOSITORY_ROOT,
) -> tuple[dict[str, dict[str, dict[str, Any]]], list[str]]:
    all_documents: dict[str, dict[str, dict[str, Any]]] = {}
    errors: list[str] = []

    for name, (directory, schema) in COLLECTIONS.items():
        documents, collection_errors = validate_collection(
            name,
            repository_root / directory,
            repository_root / schema,
            repository_root,
        )
        all_documents[name] = documents
        errors.extend(collection_errors)

    errors.extend(
        validate_dataset_paths(all_documents["datasets"], repository_root)
    )
    errors.extend(validate_area_hierarchy(all_documents["areas"]))
    errors.extend(
        validate_topic_areas(all_documents["topics"], all_documents["areas"])
    )
    errors.extend(validate_topic_paths(all_documents["topics"], repository_root))
    errors.extend(
        validate_views(all_documents["views"], all_documents["datasets"])
    )

    return all_documents, errors


def main() -> None:
    all_documents, errors = validate_repository()

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
