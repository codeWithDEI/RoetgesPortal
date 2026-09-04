"""Tests for persistent human decisions over generated review candidates."""

from __future__ import annotations

import sys
import unittest
from copy import deepcopy
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

from scan_sitzung_online import queue_report  # noqa: E402
from validate_content import validate_review_decisions  # noqa: E402


class DecisionReportTests(unittest.TestCase):
    def test_separates_unreviewed_planned_stale_and_resolved_items(self) -> None:
        fingerprints = {
            item_id: f"sha256:{item_id * 64}" for item_id in ("a", "b", "c", "d", "e")
        }
        current = {
            "meetings": [
                {
                    "id": "10",
                    "agendaItems": [
                        {
                            "id": item_id,
                            "title": f"Item {item_id}",
                            "reviewStatus": "tracked" if item_id == "e" else "new",
                            "fingerprint": fingerprints[item_id],
                        }
                        for item_id in fingerprints
                    ],
                }
            ]
        }
        decisions = {
            "items": [
                {
                    "candidateId": "10/b",
                    "decision": "no-topic",
                    "reviewedFingerprint": fingerprints["b"],
                },
                {
                    "candidateId": "10/c",
                    "decision": "create-topic",
                    "topicId": "planned-topic",
                    "reviewedFingerprint": fingerprints["c"],
                },
                {
                    "candidateId": "10/d",
                    "decision": "defer",
                    "reviewedFingerprint": f"sha256:{'f' * 64}",
                },
            ]
        }

        report = queue_report(deepcopy(current), current, decisions)

        self.assertIn("Candidates requiring editorial action: 3", report)
        self.assertIn("Unreviewed candidates: 1", report)
        self.assertIn("Planned topic changes: 1", report)
        self.assertIn("Stale editorial decisions: 1", report)
        self.assertIn("Decisions recorded as no topic: 1", report)
        self.assertIn("10/c` (create-topic → planned-topic)", report)
        self.assertNotIn("10/e` (", report)


class DecisionValidationTests(unittest.TestCase):
    def test_accepts_new_topic_plan_and_known_topic_update(self) -> None:
        documents = {
            "decisions": {
                "items": [
                    {
                        "candidateId": "10/20",
                        "decision": "create-topic",
                        "topicId": "future-topic",
                    },
                    {
                        "candidateId": "10/21",
                        "decision": "update-topic",
                        "topicId": "existing-topic",
                    },
                ]
            }
        }

        self.assertEqual(
            [],
            validate_review_decisions(
                documents, {"existing-topic": {"id": "existing-topic"}}
            ),
        )

    def test_reports_duplicate_candidates_and_unknown_update_topic(self) -> None:
        documents = {
            "decisions": {
                "items": [
                    {
                        "candidateId": "10/20",
                        "decision": "update-topic",
                        "topicId": "missing-topic",
                    },
                    {"candidateId": "10/20", "decision": "no-topic"},
                ]
            }
        }

        errors = validate_review_decisions(documents, {})

        self.assertTrue(any("duplicate candidate '10/20'" in error for error in errors))
        self.assertTrue(any("unknown topic 'missing-topic'" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
