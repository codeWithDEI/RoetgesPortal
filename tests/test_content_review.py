"""Tests for non-public content review queue validation."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

from validate_content import validate_review_references  # noqa: E402


class ContentReviewValidationTests(unittest.TestCase):
    def test_accepts_known_area_and_topic_references(self) -> None:
        review = {
            "queue": {
                "meetings": [
                    {
                        "id": "10",
                        "area": "local",
                        "agendaItems": [
                            {"id": "20", "matchedTopicIds": ["known-topic"]}
                        ],
                    }
                ]
            }
        }

        self.assertEqual(
            [],
            validate_review_references(
                review,
                {"known-topic": {"id": "known-topic"}},
                {"local": {"id": "local"}},
            ),
        )

    def test_reports_unknown_references_and_duplicate_identifiers(self) -> None:
        review = {
            "queue": {
                "meetings": [
                    {
                        "id": "10",
                        "area": "missing-area",
                        "agendaItems": [
                            {"id": "20", "matchedTopicIds": ["missing-topic"]},
                            {"id": "20", "matchedTopicIds": []},
                        ],
                    },
                    {"id": "10", "area": "known", "agendaItems": []},
                ]
            }
        }

        errors = validate_review_references(review, {}, {"known": {"id": "known"}})

        self.assertTrue(any("duplicate meeting id '10'" in error for error in errors))
        self.assertTrue(any("duplicate agenda item '10/20'" in error for error in errors))
        self.assertTrue(any("unknown area 'missing-area'" in error for error in errors))
        self.assertTrue(any("unknown topic 'missing-topic'" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
