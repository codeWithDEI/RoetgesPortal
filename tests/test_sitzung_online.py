"""Offline tests for the ALLRIS content monitor."""

from __future__ import annotations

import re
import sys
import unittest
from datetime import date
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = REPOSITORY_ROOT / "tests/fixtures/sitzung_online"
sys.path.insert(0, str(REPOSITORY_ROOT / "tools"))

from scan_sitzung_online import (  # noqa: E402
    CalendarMeeting,
    build_meeting_record,
    extract_timer_url,
    merge_queue,
    months_for_scan,
    parse_calendar,
    parse_meeting,
    queue_report,
)


class CalendarParsingTests(unittest.TestCase):
    def test_extracts_wicket_callback_and_stable_meeting_links(self) -> None:
        initial = (FIXTURES / "calendar_initial.html").read_text(encoding="utf-8")
        populated = (FIXTURES / "calendar_loaded.html").read_text(encoding="utf-8")

        self.assertEqual(
            "./si010?0-1.0-&MM=8&YY=2026",
            extract_timer_url(initial),
        )
        meetings = parse_calendar(
            populated,
            "https://www.papenteich.sitzung-online.de/public/",
        )

        self.assertEqual(["1000328", "1000999"], [item.meeting_id for item in meetings])
        self.assertEqual("2026-08-27", meetings[0].meeting_date)
        self.assertEqual("19:00", meetings[0].meeting_time)

    def test_calculates_months_across_year_boundaries(self) -> None:
        self.assertEqual(
            [(2025, 11), (2025, 12), (2026, 1)],
            months_for_scan(date(2026, 1, 5), 3),
        )


class MeetingParsingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.meeting_url = (
            "https://www.papenteich.sitzung-online.de/public/"
            "to010?SILFDNR=1000328&refresh=false"
        )
        document = (FIXTURES / "meeting.html").read_text(encoding="utf-8")
        self.parsed = parse_meeting(document, self.meeting_url)

    def test_reads_only_explicitly_public_agenda_sections(self) -> None:
        self.assertEqual("44", self.parsed.body_id)
        self.assertEqual(
            ["1007001", "1007002", "1007004"],
            [item.item_id for item in self.parsed.items],
        )
        self.assertNotIn("1007003", [item.item_id for item in self.parsed.items])
        self.assertEqual("1001097", self.parsed.items[1].proposal_id)
        self.assertEqual("5.1", self.parsed.items[1].number)

    def test_builds_review_candidates_and_matches_existing_topics(self) -> None:
        meeting = CalendarMeeting(
            meeting_id="1000328",
            title="Ratssitzung",
            meeting_date="2026-08-27",
            meeting_time="19:00",
            url=self.meeting_url,
        )
        record = build_meeting_record(
            meeting,
            self.parsed,
            {
                "name": "Rat der Gemeinde Rötgesbüttel",
                "area": "municipality-roetgesbuettel",
                "level": "municipality",
            },
            [re.compile(r"^Eröffnung", re.IGNORECASE)],
            {
                "TOLFDNR": {"1007002": {"glass-container-relocation"}},
                "VOLFDNR": {},
            },
        )

        self.assertEqual(["1007002", "1007004"], [item["id"] for item in record["agendaItems"]])
        self.assertEqual("tracked", record["agendaItems"][0]["reviewStatus"])
        self.assertEqual(
            ["glass-container-relocation"],
            record["agendaItems"][0]["matchedTopicIds"],
        )
        self.assertEqual("new", record["agendaItems"][1]["reviewStatus"])


class QueueTests(unittest.TestCase):
    def test_replaces_scanned_months_and_retains_older_meetings(self) -> None:
        previous = {
            "meetings": [
                {
                    "id": "1",
                    "date": "2026-07-10",
                    "time": "18:00",
                    "body": {"id": "44"},
                    "agendaItems": [],
                },
                {
                    "id": "2",
                    "date": "2026-08-10",
                    "time": "18:00",
                    "body": {"id": "44"},
                    "agendaItems": [],
                },
            ]
        }
        replacement = {
            "id": "3",
            "date": "2026-08-20",
            "time": "18:00",
            "body": {"id": "44"},
            "agendaItems": [],
        }

        queue = merge_queue(
            previous,
            [replacement],
            {(2026, 8)},
            "papenteich-sitzung-online",
            "https://www.papenteich.sitzung-online.de/public/",
        )

        self.assertEqual(["1", "3"], [meeting["id"] for meeting in queue["meetings"]])
        self.assertEqual(
            queue,
            merge_queue(
                queue,
                [replacement],
                {(2026, 8)},
                "papenteich-sitzung-online",
                queue["source"]["baseUrl"],
            ),
        )
        self.assertIn("New public agenda candidates: 0", queue_report(previous, queue))


if __name__ == "__main__":
    unittest.main()
