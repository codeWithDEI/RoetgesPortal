"""Tests for deterministic list-first portal generation."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

from build_portal import (  # noqa: E402
    build_portal,
    filter_and_sort_topics,
    make_topic_location_collection,
    make_list_item,
    resolve_relevant_area_ids,
)


class BuildPortalTests(unittest.TestCase):
    def test_resolves_area_ancestors_and_descendants_for_filters(self) -> None:
        areas = {
            "joint": {"id": "joint"},
            "one": {"id": "one", "parent": "joint"},
            "two": {"id": "two", "parent": "joint"},
        }

        self.assertEqual(
            ["joint", "one"],
            resolve_relevant_area_ids(["one"], areas),
        )
        self.assertEqual(
            ["joint", "one", "two"],
            resolve_relevant_area_ids(["joint"], areas),
        )

    def test_filters_and_sorts_topics_for_a_list_source(self) -> None:
        topics = [
            {
                "id": "older",
                "visibility": "published",
                "status": "committee",
                "title": "Older",
                "dates": {"updatedAt": "2026-01-01"},
            },
            {
                "id": "newer",
                "visibility": "published",
                "status": "council",
                "title": "Newer",
                "dates": {"updatedAt": "2026-02-01"},
            },
            {
                "id": "draft",
                "visibility": "draft",
                "status": "idea",
                "title": "Draft",
                "dates": {"updatedAt": "2026-03-01"},
            },
        ]
        source = {
            "filter": {
                "visibility": ["published"],
                "status": ["committee", "council"],
            },
            "sort": [
                {
                    "field": "dates.updatedAt",
                    "direction": "descending",
                }
            ],
        }

        selected = filter_and_sort_topics(topics, source)

        self.assertEqual(["newer", "older"], [item["id"] for item in selected])

    def test_list_item_contains_compact_navigation_data(self) -> None:
        topic = {
            "id": "road-safety",
            "title": "Road safety",
            "summary": "A short summary.",
            "status": "committee",
            "categories": ["mobility"],
            "organizations": ["municipality"],
            "dates": {
                "createdAt": "2026-01-01",
                "updatedAt": "2026-02-01",
                "lastVerifiedAt": "2026-02-02",
            },
            "milestones": [
                {
                    "date": "2026-05-01",
                    "title": "Later milestone",
                    "status": "planned",
                },
                {
                    "date": "2026-04-01",
                    "title": "Next milestone",
                    "status": "planned",
                },
            ],
        }

        item = make_list_item(topic)

        self.assertEqual("../../topics/road-safety.json", item["detail"])
        self.assertEqual(
            "Next milestone", item["upcomingMilestone"]["title"]
        )

    def test_topic_locations_become_enriched_geojson_features(self) -> None:
        topic = {
            "id": "road-safety",
            "title": "Road safety",
            "summary": "A short summary.",
            "status": "committee",
            "categories": ["mobility"],
            "organizations": ["municipality"],
            "locations": [
                {
                    "id": "junction",
                    "label": "Junction",
                    "impactType": "direct",
                    "geoJsonFile": (
                        "content/locations/"
                        "parking-restrictions-schulgarten-eikhof.geojson"
                    ),
                }
            ],
        }

        collection = make_topic_location_collection(
            REPOSITORY_ROOT, [topic]
        )

        self.assertEqual(1, len(collection["features"]))
        properties = collection["features"][0]["properties"]
        self.assertEqual("road-safety", properties["topicId"])
        self.assertEqual("Junction", properties["locationLabel"])
        self.assertEqual("/themen/road-safety", properties["detailPath"])

    def test_repository_build_is_deterministic_and_excludes_drafts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)

            counts = build_portal(REPOSITORY_ROOT, output)
            first_build = {
                path.relative_to(output): path.read_bytes()
                for path in output.rglob("*")
                if path.is_file()
            }
            build_portal(REPOSITORY_ROOT, output)
            second_build = {
                path.relative_to(output): path.read_bytes()
                for path in output.rglob("*")
                if path.is_file()
            }

            self.assertEqual(first_build, second_build)
            self.assertEqual(7, counts["areas"])
            self.assertEqual(12, counts["topics"])
            self.assertEqual(1, counts["datasets"])
            self.assertEqual(2, counts["views"])
            self.assertFalse((output / "topics/example-topic.json").exists())
            self.assertFalse(
                (output / "views/flea-market/manifest.json").exists()
            )

            council_items = json.loads(
                (output / "views/council/items.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertGreater(len(council_items["items"]), 0)
            self.assertEqual(
                [
                    "joint-municipality-papenteich",
                    "municipality-roetgesbuettel",
                ],
                council_items["facets"]["areas"],
            )
            self.assertEqual(
                sorted(council_items["facets"]["categories"]),
                council_items["facets"]["categories"],
            )

            council_map = json.loads(
                (
                    output
                    / "views/council-map/layers/council-topics.geojson"
                ).read_text(encoding="utf-8")
            )
            self.assertEqual(2, len(council_map["features"]))
            self.assertEqual(
                {
                    "glass-container-relocation",
                    "parking-restrictions-schulgarten-eikhof",
                },
                {
                    feature["properties"]["topicId"]
                    for feature in council_map["features"]
                },
            )


if __name__ == "__main__":
    unittest.main()
