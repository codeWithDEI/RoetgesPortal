"""Counter tests use synthetic reduced Caddy logs, never production requests."""

from datetime import date, datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("portal_analytics", ROOT / "deploy/analytics/aggregate.py")
analytics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analytics)
UTC = timezone.utc


def record(stamp="2026-10-10T15:00:00+00:00", uri="/themen", status=200,
           method="GET", mime="text/html; charset=utf-8", policy=True):
    value = {"ts": datetime.fromisoformat(stamp).timestamp(), "status": status,
             "request": {"remote_ip": "0.0.0.0", "client_ip": "0.0.0.0",
                         "uri": uri, "method": method},
             "resp_headers": {} if mime is None else {"Content-Type": [mime]}}
    if policy:
        value["analytics_policy"] = analytics.POLICY
    return value


class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.logs = self.root / "logs"
        self.state = self.root / "state"
        self.report = self.root / "report"
        self.logs.mkdir()
        self.active = self.logs / "portal-access.log"
        self.now = datetime(2026, 10, 10, 18, tzinfo=UTC)

    def append(self, *records, path=None):
        with (path or self.active).open("ab") as stream:
            for value in records:
                stream.write(json.dumps(value).encode() + b"\n")

    def generate(self, now=None):
        return analytics.generate(self.logs, self.state, self.report, now=now or self.now)

    def test_request_pageview_and_visitor_definitions(self):
        self.append(record(), record(uri="/themen/example-topic?redacted"),
                    record(status=304, mime=None), record(status=404),
                    record(status=302), record(uri="/api/health", mime="application/json"),
                    record(uri="/assets/app.js", mime="text/javascript"),
                    record(method="HEAD"), record(mime="text/x-component"),
                    record(mime=None), record(uri="/unknown-page"),
                    record(status=204), record(status=205))
        report = self.generate()
        self.assertEqual(report["metrics"]["today"]["pageviews"], 3)
        self.assertEqual(report["metrics"]["today"]["requests"], 13)
        self.assertTrue(all(metric["visitors"] is None for metric in report["metrics"].values()))
        self.assertTrue(all(day["visitors"] is None for day in report["days"]))

    def test_repeated_runs_and_new_process_do_not_duplicate(self):
        self.append(record(), record())  # Equal timestamps are separate requests.
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 2)
        self.append(record(stamp="2026-10-10T16:00:00+00:00"))
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 3)
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 3)
        self.assertEqual(analytics.load_state(self.state / "state.json")["days"]["2026-10-10"]["pageviews"], 3)

    def test_rotation_reads_unprocessed_tail_and_new_active_file(self):
        self.append(record())
        self.generate()
        self.append(record(), record())
        self.active.rename(self.logs / "portal-access-2026-10-10T18-00-00-size.log")
        self.append(record(), record())
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 5)
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 5)

    def test_rename_during_open_does_not_duplicate_inode(self):
        self.append(record())
        self.generate()
        (self.logs / "portal-access-hardlink.log").hardlink_to(self.active)
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 1)

    def test_partial_line_is_consumed_once_when_completed(self):
        self.append(record())
        line = json.dumps(record()).encode()
        with self.active.open("ab") as stream:
            stream.write(line[:25])
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 1)
        with self.active.open("ab") as stream:
            stream.write(line[25:] + b"\n")
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 2)
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 2)

    def test_calendar_boundaries_use_berlin_not_utc(self):
        self.append(record(stamp="2026-10-09T21:59:59+00:00"),
                    record(stamp="2026-10-09T22:00:00+00:00"),
                    record(stamp="2026-10-08T21:59:59+00:00"))
        report = self.generate()
        for key in ("today", "yesterday", "dayBeforeYesterday"):
            self.assertEqual(report["metrics"][key]["pageviews"], 1)
        self.assertEqual(report["metrics"]["last7Days"]["pageviews"], 3)
        self.assertEqual(report["hours"][0]["pageviews"], 1)
        self.assertEqual(report["hours"][-1]["pageviews"], None)
        self.assertTrue(report["hours"][-1]["future"])

    def test_spring_dst_has_23_hours(self):
        self.append(record(stamp="2026-03-29T00:30:00+00:00"),
                    record(stamp="2026-03-29T01:30:00+00:00"))
        report = self.generate(datetime(2026, 3, 29, 20, tzinfo=UTC))
        self.assertEqual(len(report["hours"]), 23)
        self.assertNotIn("02:00 CET", [hour["label"] for hour in report["hours"]])
        self.assertEqual(report["hours"][1]["label"], "01:00 CET")
        self.assertEqual(report["hours"][2]["label"], "03:00 CEST")
        self.assertEqual(sum(hour["pageviews"] or 0 for hour in report["hours"]), 2)

    def test_autumn_dst_keeps_both_repeated_hours(self):
        self.append(record(stamp="2026-10-25T00:30:00+00:00"),
                    record(stamp="2026-10-25T01:30:00+00:00"),
                    record(stamp="2026-10-25T01:45:00+00:00"))
        report = self.generate(datetime(2026, 10, 25, 20, tzinfo=UTC))
        self.assertEqual(len(report["hours"]), 25)
        repeated = [hour for hour in report["hours"] if hour["label"].startswith("02:")]
        self.assertEqual([hour["label"] for hour in repeated], ["02:00 CEST", "02:00 CET"])
        self.assertEqual([hour["pageviews"] for hour in repeated], [1, 2])
        self.assertEqual(report["metrics"]["today"]["pageviews"], 3)

    def test_history_survives_deleted_logs_and_report_recreation(self):
        self.append(record(stamp="2026-10-09T15:00:00+00:00", policy=False))
        self.generate()
        self.active.unlink()
        import shutil
        shutil.rmtree(self.report)
        report = self.generate()
        self.assertEqual(report["metrics"]["yesterday"]["pageviews"], 1)
        self.assertFalse(report["metrics"]["yesterday"]["complete"])
        self.assertEqual(report["days"][-2]["legacyPageviews"], 1)
        # Recreating the report does not reset the durable counter volume.
        self.assertTrue((self.report / "index.html").is_file())

    def test_minimum_twelve_months_and_retention_cutoff(self):
        self.append(record(stamp="2025-09-05T12:00:00+00:00"),
                    record(stamp="2025-10-10T12:00:00+00:00"),
                    record(stamp="2025-09-04T12:00:00+00:00"))
        report = self.generate()
        self.assertEqual(len(report["days"]), 400)
        self.assertEqual(report["days"][0]["date"], "2025-09-06")
        stored = analytics.load_state(self.state / "state.json")["days"]
        self.assertEqual(set(stored), {"2025-10-10"})
        self.assertEqual(next(row for row in report["days"] if row["date"] == "2025-10-10")["pageviews"], 1)

    def test_unknown_days_are_not_zero_and_gaps_are_not_complete(self):
        report = self.generate()
        self.assertIsNone(report["metrics"]["today"]["pageviews"])
        self.assertIsNone(report["days"][-2]["pageviews"])
        state = analytics.new_state()
        start = analytics.midnight(date(2026, 10, 9))
        analytics.update_coverage(state, start, 300)
        for number in range(1, 289):
            analytics.update_coverage(state, start + timedelta(minutes=5 * number), 300)
        report = analytics.snapshot(state, start + timedelta(days=1), 300)
        self.assertEqual(report["metrics"]["yesterday"]["pageviews"], 0)
        self.assertTrue(report["metrics"]["yesterday"]["complete"])
        analytics.update_coverage(state, start + timedelta(days=1, hours=1), 300)
        report = analytics.snapshot(state, start + timedelta(days=1, hours=1), 300)
        self.assertFalse(report["metrics"]["today"]["complete"])

    def test_bad_lines_are_visible_and_not_recounted(self):
        self.append(record())
        with self.active.open("ab") as stream:
            stream.write(b"invalid JSON\n")
        report = self.generate()
        self.assertEqual(report["metrics"]["today"]["pageviews"], 1)
        self.assertEqual(report["rejectedLines"], 1)
        self.assertEqual(self.generate()["rejectedLines"], 1)
        self.assertFalse(report["metrics"]["today"]["complete"])

    def test_privacy_boundary_fails_closed_and_leaves_previous_report(self):
        self.append(record())
        self.generate()
        previous = (self.report / "stats.json").read_bytes()
        for field, bad in (("remote_ip", "192.0.2.1"), ("headers", {"User-Agent": ["Private Agent"]}),
                           ("remote_port", "1234"), ("uri", "/?secret=value")):
            value = record()
            value["request"][field] = bad
            with self.subTest(field=field):
                with self.assertRaises(PermissionError):
                    analytics.classify(value, self.now)
        self.append(value)
        with self.assertRaises(PermissionError):
            self.generate()
        self.assertEqual((self.report / "stats.json").read_bytes(), previous)

    def test_no_paths_headers_identifiers_or_checkpoints_in_report(self):
        self.append(record(uri="/themen/private-path-marker?redacted"))
        self.generate()
        public = (self.report / "stats.json").read_text()
        private = (self.state / "state.json").read_text()
        for forbidden in ("private-path-marker", "remote_ip", "client_ip", "headers", "user-agent", "redacted"):
            self.assertNotIn(forbidden, public)
            self.assertNotIn(forbidden, private)
        self.assertNotIn("anchor", public)
        self.assertNotIn("files", public)
        self.assertEqual((self.state / "state.json").stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.state.stat().st_mode & 0o777, 0o700)

    def test_truncation_and_rewrite_require_review_without_recounting(self):
        self.append(record())
        self.generate()
        previous = (self.state / "state.json").read_bytes()
        self.active.write_bytes(b"")
        with self.assertRaises(ValueError):
            self.generate()
        self.assertEqual((self.state / "state.json").read_bytes(), previous)

    def test_middle_rewrite_is_detected(self):
        self.append(*(record() for _ in range(20)))
        self.generate()
        data = bytearray(self.active.read_bytes())
        data[len(data) // 2] ^= 1
        self.active.write_bytes(data)
        with self.assertRaises(ValueError):
            self.generate()

    def test_missing_log_directory_is_not_reported_as_zero(self):
        self.logs.rmdir()
        with self.assertRaises(ValueError):
            self.generate()

    def test_atomic_commit_failure_does_not_duplicate_on_retry(self):
        self.append(record())
        self.generate()
        self.append(record())
        original = analytics.atomic_json

        def fail_publication(path, value, mode):
            if path.name == "stats.json":
                raise OSError("Simulated failure after state commit")
            return original(path, value, mode)

        with patch.object(analytics, "atomic_json", side_effect=fail_publication):
            with self.assertRaises(OSError):
                self.generate()
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 2)

    def test_invalid_state_is_not_silently_reset(self):
        self.append(record())
        self.generate()
        (self.state / "state.json").write_text("{broken")
        with self.assertRaises(ValueError):
            self.generate()

    def test_exclusive_writer_lock_prevents_simultaneous_processing(self):
        import fcntl
        self.append(record())
        self.generate()
        with (self.state / "writer.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                self.generate()
        self.assertEqual(self.generate()["metrics"]["today"]["pageviews"], 1)

    def test_freshness_check_rejects_stale_and_future_reports(self):
        import os
        import sys
        from contextlib import redirect_stderr
        import io
        self.generate()
        command = ["aggregate.py", "--check-fresh", "--report-directory", str(self.report)]
        for age, expected in ((0, 0), (1000, 1), (-1000, 1)):
            report = json.loads((self.report / "stats.json").read_text())
            report["generatedAt"] = analytics.iso(datetime.now(UTC) - timedelta(seconds=age))
            analytics.atomic_json(self.report / "stats.json", report, 0o644)
            with patch.object(sys, "argv", command), patch.dict(os.environ, {"ANALYTICS_REFRESH_SECONDS": "300"}), redirect_stderr(io.StringIO()):
                self.assertEqual(analytics.main(), expected)

    def test_symlinks_are_not_log_inputs(self):
        other = self.root / "unrelated.log"
        other.write_text(json.dumps(record()) + "\n")
        self.active.symlink_to(other)
        with self.assertRaises(OSError):
            self.generate()

    def test_refresh_interval_and_compose_exposure(self):
        with self.assertRaises(ValueError):
            analytics.generate(self.logs, self.state, self.report, refresh_seconds=0)
        import yaml
        compose = yaml.safe_load((ROOT / "deploy/compose.yaml").read_text())
        self.assertEqual(compose["services"]["analytics"]["network_mode"], "none")
        self.assertTrue(compose["services"]["analytics-dashboard"]["ports"][0].startswith("127.0.0.1:"))
        self.assertIn("analytics_state:/var/lib/roetgesportal-analytics", compose["services"]["analytics"]["volumes"])
        self.assertEqual(compose["services"]["analytics-dashboard"]["volumes"], ["analytics_report:/srv/report:ro"])


if __name__ == "__main__":
    unittest.main()
