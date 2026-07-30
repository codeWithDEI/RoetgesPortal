"""Build deterministic runtime artifacts for the RötgesPortal web application."""

from __future__ import annotations

import argparse
import json
import shutil
from copy import deepcopy
from pathlib import Path
from typing import Any

from import_roetgesmarkt import fix_feature
from validate_content import REPOSITORY_ROOT, validate_repository


DEFAULT_OUTPUT = REPOSITORY_ROOT / "generated"
SCHEMA_VERSION = 1


def nested_value(document: dict[str, Any], field: str) -> Any:
    """Read a dot-separated field from a document."""
    value: Any = document
    for part in field.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def matches_filter(document: dict[str, Any], filters: dict[str, Any]) -> bool:
    """Return whether a topic matches every configured filter dimension."""
    for field, accepted_values in filters.items():
        value = document.get(field)
        if isinstance(value, list):
            if not set(value).intersection(accepted_values):
                return False
        elif value not in accepted_values:
            return False
    return True


def filter_and_sort_topics(
    topics: list[dict[str, Any]], source: dict[str, Any]
) -> list[dict[str, Any]]:
    """Apply a view source's topic filter and stable multi-field ordering."""
    filters = source.get("filter", {})
    selected = [
        topic for topic in topics if matches_filter(topic, filters)
    ]

    sort_rules = source.get("sort", [])
    for rule in reversed(sort_rules):
        field = rule["field"]
        reverse = rule["direction"] == "descending"
        selected.sort(
            key=lambda topic: (
                nested_value(topic, field) is None,
                nested_value(topic, field),
            ),
            reverse=reverse,
        )
    return selected


def upcoming_milestone(topic: dict[str, Any]) -> dict[str, Any] | None:
    """Return the first planned milestone without using the build date."""
    planned = [
        milestone
        for milestone in topic.get("milestones", [])
        if milestone.get("status") == "planned"
    ]
    if not planned:
        return None
    return min(planned, key=lambda milestone: milestone["date"])


def make_list_item(topic: dict[str, Any]) -> dict[str, Any]:
    """Create the compact topic representation consumed by list views."""
    item = {
        "id": topic["id"],
        "title": topic["title"],
        "summary": topic["summary"].strip(),
        "status": topic["status"],
        "categories": topic.get("categories", []),
        "organizations": topic.get("organizations", []),
        "dates": topic["dates"],
        "detail": f"../../topics/{topic['id']}.json",
    }
    milestone = upcoming_milestone(topic)
    if milestone is not None:
        item["upcomingMilestone"] = milestone
    return item


def facet_values(
    topics: list[dict[str, Any]], facets: list[str]
) -> dict[str, list[str]]:
    """Collect deterministic filter values for a list presentation."""
    values: dict[str, list[str]] = {}
    for facet in facets:
        collected: set[str] = set()
        for topic in topics:
            value = topic.get(facet)
            if isinstance(value, list):
                collected.update(str(item) for item in value)
            elif isinstance(value, str):
                collected.add(value)
        values[facet] = sorted(collected)
    return values


def write_json(path: Path, document: Any) -> None:
    """Write stable, human-readable UTF-8 JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(
            document,
            file,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        file.write("\n")


def write_geojson_dataset(
    repository_root: Path,
    output_root: Path,
    dataset: dict[str, Any],
) -> str:
    """Normalize and write a GeoJSON dataset artifact."""
    source_path = repository_root / dataset["path"]
    with source_path.open("r", encoding="utf-8") as file:
        document = json.load(file)

    if dataset.get("normalization") == "roetgesmarkt":
        document["features"] = [
            fix_feature(deepcopy(feature))
            for feature in document.get("features", [])
        ]

    relative_path = f"datasets/{dataset['id']}.geojson"
    write_json(output_root / relative_path, document)
    return relative_path


def clean_owned_outputs(output_root: Path) -> None:
    """Remove only artifact paths owned by this generator."""
    for directory in ("datasets", "topics", "views"):
        path = output_root / directory
        if path.exists():
            shutil.rmtree(path)

    search_index = output_root / "search-index.json"
    if search_index.exists():
        search_index.unlink()


def build_portal(
    repository_root: Path = REPOSITORY_ROOT,
    output_root: Path = DEFAULT_OUTPUT,
) -> dict[str, int]:
    """Validate editorial content and generate public runtime artifacts."""
    documents, errors = validate_repository(repository_root)
    if errors:
        formatted = "\n".join(f"ERROR: {error}" for error in errors)
        raise ValueError(f"Content validation failed:\n{formatted}")

    clean_owned_outputs(output_root)

    published_topics = sorted(
        (
            deepcopy(topic)
            for topic in documents["topics"].values()
            if topic["visibility"] == "published"
        ),
        key=lambda topic: topic["id"],
    )
    published_views = sorted(
        (
            view
            for view in documents["views"].values()
            if view["visibility"] == "published"
        ),
        key=lambda view: view["id"],
    )
    required_dataset_ids = {
        source["dataset"]
        for view in published_views
        for source in view["sources"]
    }

    for topic in published_topics:
        write_json(
            output_root / f"topics/{topic['id']}.json",
            {
                "schemaVersion": SCHEMA_VERSION,
                "topic": topic,
            },
        )

    dataset_artifacts: dict[str, str] = {}
    for dataset in sorted(
        documents["datasets"].values(), key=lambda item: item["id"]
    ):
        if dataset["id"] not in required_dataset_ids:
            continue
        if dataset["type"] == "topics":
            relative_path = f"datasets/{dataset['id']}.json"
            write_json(
                output_root / relative_path,
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "id": dataset["id"],
                    "items": published_topics,
                },
            )
            dataset_artifacts[dataset["id"]] = relative_path
        elif dataset["type"] == "geojson":
            dataset_artifacts[dataset["id"]] = write_geojson_dataset(
                repository_root, output_root, dataset
            )

    view_index: list[dict[str, Any]] = []
    for view in published_views:
        source_by_id = {
            source["id"]: source for source in view["sources"]
        }
        presentation = view["presentation"]
        view_directory = output_root / f"views/{view['id']}"
        manifest: dict[str, Any] = {
            "schemaVersion": SCHEMA_VERSION,
            "id": view["id"],
            "title": view["title"],
            "description": view["description"],
            "route": view["route"],
            "presentation": deepcopy(presentation),
            "sources": [],
        }

        for source in view["sources"]:
            manifest["sources"].append(
                {
                    "id": source["id"],
                    "dataset": source["dataset"],
                    "artifact": (
                        f"../../{dataset_artifacts[source['dataset']]}"
                    ),
                }
            )

        if presentation["type"] == "list":
            source = source_by_id[presentation["source"]]
            selected_topics = filter_and_sort_topics(
                published_topics, source
            )
            list_items = [make_list_item(topic) for topic in selected_topics]
            write_json(
                view_directory / "items.json",
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "view": view["id"],
                    "items": list_items,
                    "facets": facet_values(
                        selected_topics, presentation.get("facets", [])
                    ),
                },
            )
            manifest["data"] = "items.json"

        write_json(view_directory / "manifest.json", manifest)
        view_index.append(
            {
                "id": view["id"],
                "title": view["title"],
                "description": view["description"],
                "route": view["route"],
                "presentationType": presentation["type"],
                "manifest": f"{view['id']}/manifest.json",
            }
        )

    write_json(
        output_root / "views/index.json",
        {
            "schemaVersion": SCHEMA_VERSION,
            "views": view_index,
        },
    )

    search_items = [
        {
            "id": topic["id"],
            "title": topic["title"],
            "summary": topic["summary"].strip(),
            "status": topic["status"],
            "categories": topic.get("categories", []),
            "organizations": topic.get("organizations", []),
            "detail": f"topics/{topic['id']}.json",
        }
        for topic in sorted(
            published_topics, key=lambda item: (item["title"], item["id"])
        )
    ]
    write_json(
        output_root / "search-index.json",
        {
            "schemaVersion": SCHEMA_VERSION,
            "items": search_items,
        },
    )

    return {
        "topics": len(published_topics),
        "datasets": len(dataset_artifacts),
        "views": len(view_index),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Runtime artifact directory (default: generated)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    counts = build_portal(output_root=args.output.resolve())
    summary = ", ".join(
        f"{count} {name[:-1] if count == 1 else name}"
        for name, count in counts.items()
    )
    print(f"Portal generation passed: {summary}")


if __name__ == "__main__":
    main()
