"""Tests for cross-file view validation."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

from validate_content import validate_views  # noqa: E402


class ValidateViewsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.datasets = {
            "topics": {"id": "topics", "type": "topics"},
            "stands": {"id": "stands", "type": "geojson"},
        }

    def test_accepts_list_and_map_presentations(self) -> None:
        views = {
            "topics": {
                "route": "/topics",
                "sources": [
                    {
                        "id": "active",
                        "dataset": "topics",
                        "filter": {"visibility": ["published"]},
                    }
                ],
                "presentation": {
                    "type": "list",
                    "source": "active",
                },
            },
            "map": {
                "route": "/map",
                "sources": [{"id": "stands", "dataset": "stands"}],
                "presentation": {
                    "type": "map",
                    "map": {
                        "center": {"longitude": 10.5, "latitude": 52.4},
                        "zoom": 14,
                    },
                    "layers": [{"id": "stands", "source": "stands"}],
                },
            },
        }

        self.assertEqual([], validate_views(views, self.datasets))

    def test_reports_unknown_sources_and_incompatible_filters(self) -> None:
        views = {
            "invalid": {
                "route": "/invalid",
                "sources": [
                    {
                        "id": "stands",
                        "dataset": "stands",
                        "filter": {"visibility": ["published"]},
                    }
                ],
                "presentation": {
                    "type": "list",
                    "source": "missing",
                },
            }
        }

        errors = validate_views(views, self.datasets)

        self.assertTrue(
            any("require a topics dataset" in error for error in errors)
        )
        self.assertTrue(any("unknown source 'missing'" in error for error in errors))

    def test_reports_duplicate_source_and_layer_ids(self) -> None:
        views = {
            "invalid": {
                "route": "/invalid",
                "sources": [
                    {"id": "stands", "dataset": "stands"},
                    {"id": "stands", "dataset": "stands"},
                ],
                "presentation": {
                    "type": "map",
                    "map": {
                        "center": {"longitude": 10.5, "latitude": 52.4},
                        "zoom": 14,
                    },
                    "layers": [
                        {"id": "stands", "source": "stands"},
                        {"id": "stands", "source": "stands"},
                    ],
                },
            }
        }

        errors = validate_views(views, self.datasets)

        self.assertTrue(any("duplicate source id" in error for error in errors))
        self.assertTrue(any("duplicate layer id" in error for error in errors))

    def test_reports_duplicate_sort_fields(self) -> None:
        views = {
            "invalid": {
                "route": "/invalid",
                "sources": [
                    {
                        "id": "topics",
                        "dataset": "topics",
                        "sort": [
                            {
                                "field": "title",
                                "direction": "ascending",
                            },
                            {
                                "field": "title",
                                "direction": "descending",
                            },
                        ],
                    }
                ],
                "presentation": {
                    "type": "list",
                    "source": "topics",
                },
            }
        }

        errors = validate_views(views, self.datasets)

        self.assertTrue(any("duplicate sort field" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
