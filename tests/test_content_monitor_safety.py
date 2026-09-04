"""Safety-focused tests for content-monitor source selection."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

from scan_sitzung_online import is_configured_body_name  # noqa: E402


class BodyRecognitionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.bodies = {
            "44": {
                "name": "Rat der Gemeinde Rötgesbüttel",
                "area": "municipality-roetgesbuettel",
                "level": "municipality",
            },
            "13": {
                "name": "Schulausschuss",
                "area": "joint-municipality-papenteich",
                "level": "joint-municipality",
            },
        }

    def test_recognizes_configured_body_without_identifier(self) -> None:
        self.assertTrue(
            is_configured_body_name("Rat der Gemeinde Rötgesbüttel", self.bodies)
        )
        self.assertTrue(is_configured_body_name("Schulausschuss", self.bodies))

    def test_does_not_treat_unregistered_working_group_as_configured(self) -> None:
        self.assertFalse(
            is_configured_body_name('Arbeitskreis "Klima und Energie"', self.bodies)
        )


if __name__ == "__main__":
    unittest.main()
