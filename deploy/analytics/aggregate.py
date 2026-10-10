"""Private, identifier-free counters from the same reduced logs as GoAccess.

Caddy's append/rename rotation contract is required. Checkpoints and counters
are committed together, before publishing an aggregate-only snapshot. Never
deduplicate by request timestamp: simultaneous legitimate requests must count.
"""

import argparse
from contextlib import ExitStack
from datetime import date, datetime, timedelta, timezone
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import tempfile
from zoneinfo import ZoneInfo

BERLIN = ZoneInfo("Europe/Berlin")
UTC = timezone.utc
RETENTION_DAYS = 400
POLICY = "pageviews-v1"
MAX_LINE_BYTES = 1024 * 1024
PAGE_PATH = re.compile(
    r"/(?:themen(?:/[a-z0-9][a-z0-9-]*)?|karte|neu|projekt|"
    r"impressum|datenschutz|kontakt|barrierefreiheit)?/?\Z"
)


def iso(value):
    return value.astimezone(UTC).isoformat()


def midnight(day):
    return datetime.combine(day, datetime.min.time(), BERLIN).astimezone(UTC)


def atomic_json(path, value, mode):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".pending-", dir=path.parent)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def new_state():
    return {"version": 1, "timezone": "Europe/Berlin", "policy": POLICY,
            "days": {}, "files": {}, "coverage": [], "rejectedLines": 0}


def load_state(path):
    if not path.exists():
        return new_state()
    state = json.loads(path.read_text(encoding="utf-8"))
    if (state.get("version") != 1 or state.get("policy") != POLICY
            or state.get("timezone") != "Europe/Berlin"):
        raise ValueError("Incompatible analytics state; operator review required")
    for field in ("days", "files"):
        if not isinstance(state.get(field), dict):
            raise ValueError("Invalid analytics state")
    if not isinstance(state.get("coverage"), list) or not isinstance(state.get("rejectedLines"), int):
        raise ValueError("Invalid analytics state")
    return state


def content_type(record):
    headers = record.get("resp_headers", {})
    if not isinstance(headers, dict):
        raise ValueError("Invalid response headers")
    for key, values in headers.items():
        if key.lower() == "content-type":
            if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
                raise ValueError("Invalid content type")
            return values[0].split(";", 1)[0].strip().lower() if values else None
    return None


def classify(record, now):
    """Return only time and counters. Refuse logs violating the privacy boundary."""
    request = record["request"]
    if (any(request.get(key, "0.0.0.0") != "0.0.0.0" for key in ("remote_ip", "client_ip"))
            or request.get("headers") or "remote_port" in request):
        raise PermissionError("Input is not a reduced Caddy log")
    uri = request["uri"]
    if not isinstance(uri, str) or not uri.startswith("/"):
        raise ValueError("Invalid request URI")
    path, separator, query = uri.partition("?")
    if separator and query != "redacted":
        raise PermissionError("Input contains an unredacted query")
    timestamp = record["ts"]
    if isinstance(timestamp, bool) or not isinstance(timestamp, (int, float)) or not math.isfinite(timestamp):
        raise ValueError("Invalid timestamp")
    when = datetime.fromtimestamp(timestamp, UTC)
    # fstat/read occur just after taking the report clock. Allow this tiny race,
    # but do not accept materially future-dated records.
    if when > now + timedelta(seconds=5):
        raise ValueError("Future timestamp")
    status = record["status"]
    if isinstance(status, bool) or not isinstance(status, int) or not 100 <= status <= 599:
        raise ValueError("Invalid status")
    mime = content_type(record)
    # A 304 is a successful revalidation of an existing document, often with no
    # Content-Type. Legacy lines with no MIME are counted only as requests.
    pageview = (request.get("method") == "GET" and bool(PAGE_PATH.fullmatch(path))
                and ((200 <= status < 300 and status not in (204, 205)) or status == 304)
                and (mime == "text/html" or (status == 304 and mime is None)))
    return when, int(pageview), record.get("analytics_policy") != POLICY


def anchor(stream, offset):
    """Verify all processed bytes without persisting bytes or request paths."""
    stream.seek(0)
    digest = hashlib.sha256()
    remaining = offset
    while remaining:
        chunk = stream.read(min(remaining, MAX_LINE_BYTES))
        if not chunk:
            raise ValueError("Processed log was truncated")
        digest.update(chunk)
        remaining -= len(chunk)
    return digest.hexdigest()


def increment(state, when, pageviews, legacy):
    local = when.astimezone(BERLIN)
    key = local.date().isoformat()
    day = state["days"].setdefault(key, {
        "requests": 0, "pageviews": 0, "legacyRequests": 0,
        "legacyPageviews": 0, "hours": {}})
    # Use UTC keys so the two 02:00 hours in autumn remain separate.
    hour_key = iso(when.replace(minute=0, second=0, microsecond=0))
    hour = day["hours"].setdefault(hour_key, {"requests": 0, "pageviews": 0})
    day["requests"] += 1
    day["pageviews"] += pageviews
    day["legacyRequests"] += int(legacy)
    day["legacyPageviews"] += pageviews * int(legacy)
    hour["requests"] += 1
    hour["pageviews"] += pageviews


def ingest(state, log_directory, now):
    if not log_directory.is_dir():
        raise ValueError("Log directory is missing")
    seen = set()
    cutoff = now.astimezone(BERLIN).date() - timedelta(days=RETENTION_DAYS - 1)
    # Open the snapshot first. File descriptors survive Caddy's rename; bytes
    # appended after fstat are left for the next pass. Symlinks are not inputs.
    with ExitStack() as stack:
        inputs = []
        for path in sorted(log_directory.glob("portal-access*.log")):
            descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            stream = stack.enter_context(os.fdopen(descriptor, "rb"))
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode):
                raise ValueError("Log input must be a regular file")
            inputs.append((stream, info))
        for stream, info in inputs:
            identity = f"{info.st_dev}:{info.st_ino}"
            if identity in seen:
                continue  # A rename race or hard link, not a second log file.
            seen.add(identity)
            previous = state["files"].get(identity, {"offset": 0})
            offset = previous["offset"]
            if info.st_size < offset or (offset and anchor(stream, offset) != previous["anchor"]):
                raise ValueError("Processed log was truncated or rewritten; operator review required")
            stream.seek(offset)
            while stream.tell() < info.st_size:
                start = stream.tell()
                line = stream.readline(min(MAX_LINE_BYTES + 1, info.st_size - start))
                if len(line) > MAX_LINE_BYTES:
                    raise ValueError("Oversized log line; operator review required")
                if not line.endswith(b"\n"):
                    stream.seek(start)  # Incomplete active line: retry next time.
                    break
                try:
                    when, pageviews, legacy = classify(json.loads(line), now)
                except PermissionError:
                    raise  # Do not publish GoAccess from unsanitized inputs either.
                except (ValueError, KeyError, TypeError, OverflowError, OSError, AttributeError):
                    state["rejectedLines"] += 1
                else:
                    if when.astimezone(BERLIN).date() >= cutoff:
                        increment(state, when, pageviews, legacy)
            offset = stream.tell()
            state["files"][identity] = {"offset": offset, "anchor": anchor(stream, offset)}
    # Only live files need checkpoints. Daily counters outlive the short logs.
    state["files"] = {key: value for key, value in state["files"].items() if key in seen}
    state["days"] = {key: value for key, value in state["days"].items() if key >= cutoff.isoformat()}


def update_coverage(state, now, refresh_seconds):
    stamp = iso(now)
    coverage = state["coverage"]
    if coverage and now < datetime.fromisoformat(coverage[-1][1]):
        raise ValueError("Clock moved backwards; operator review required")
    if coverage and now - datetime.fromisoformat(coverage[-1][1]) <= timedelta(seconds=2 * refresh_seconds + 60):
        coverage[-1][1] = stamp
    else:
        coverage.append([stamp, stamp])
    cutoff = midnight(now.astimezone(BERLIN).date() - timedelta(days=RETENTION_DAYS - 1))
    state["coverage"] = [[max(start, iso(cutoff)), end] for start, end in coverage if end >= iso(cutoff)]


def covered(state, start, end):
    return not state["rejectedLines"] and any(
        datetime.fromisoformat(first) <= start and datetime.fromisoformat(last) >= end
        for first, last in state["coverage"])


def snapshot(state, now, refresh_seconds):
    today = now.astimezone(BERLIN).date()
    first = today - timedelta(days=RETENTION_DAYS - 1)
    rows = []
    for number in range(RETENTION_DAYS):
        day = first + timedelta(days=number)
        counts = state["days"].get(day.isoformat())
        complete = covered(state, midnight(day), min(midnight(day + timedelta(days=1)), now))
        available = counts is not None or complete
        rows.append({"date": day.isoformat(), "requests": (counts or {}).get("requests", 0) if available else None,
                     "pageviews": (counts or {}).get("pageviews", 0) if available else None,
                     "visitors": None, "complete": bool(complete),
                     "legacyPageviews": (counts or {}).get("legacyPageviews", 0)})
    metrics = {}
    for name, length in (("today", 1), ("last7Days", 7), ("last30Days", 30)):
        chosen = rows[-length:]
        metrics[name] = {"pageviews": sum(row["pageviews"] or 0 for row in chosen)
                        if any(row["pageviews"] is not None for row in chosen) else None,
                        "requests": sum(row["requests"] or 0 for row in chosen)
                        if any(row["requests"] is not None for row in chosen) else None,
                        "visitors": None, "complete": all(row["complete"] for row in chosen)}
    for name, row in (("yesterday", rows[-2]), ("dayBeforeYesterday", rows[-3])):
        metrics[name] = {key: row[key] for key in ("pageviews", "requests", "visitors", "complete")}
    hours = []
    start, end = midnight(today), midnight(today + timedelta(days=1))
    hour_counts = state["days"].get(today.isoformat(), {}).get("hours", {})
    while start < end:
        counts = hour_counts.get(iso(start))
        future = start > now
        complete = not future and covered(state, start, min(start + timedelta(hours=1), now))
        available = not future and (counts is not None or complete)
        local = start.astimezone(BERLIN)
        hours.append({"start": iso(start), "label": local.strftime("%H:%M %Z"),
                      "pageviews": (counts or {}).get("pageviews", 0) if available else None,
                      "requests": (counts or {}).get("requests", 0) if available else None,
                      "visitors": None, "complete": bool(complete), "future": future})
        start += timedelta(hours=1)
    return {"version": 1, "generatedAt": iso(now), "timezone": "Europe/Berlin",
            "today": today.isoformat(), "refreshSeconds": refresh_seconds,
            "retentionDays": RETENTION_DAYS, "visitorMeasurement": "unavailable",
            "rejectedLines": state["rejectedLines"], "metrics": metrics,
            "days": rows, "hours": hours}


def generate(log_directory, state_directory, report_directory, now=None, refresh_seconds=300):
    if not 60 <= refresh_seconds <= 300:
        raise ValueError("Refresh interval must be between 60 and 300 seconds")
    now = now or datetime.now(UTC)
    state_directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(state_directory, 0o700)
    with (state_directory / "writer.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        state_path = state_directory / "state.json"
        state = load_state(state_path)
        ingest(state, log_directory, now)
        update_coverage(state, now, refresh_seconds)
        report = snapshot(state, now, refresh_seconds)
        atomic_json(state_path, state, 0o600)
        atomic_json(report_directory / "stats.json", report, 0o644)
        for source, target in (("dashboard.html", "index.html"), ("dashboard.js", "dashboard.js"),
                               ("dashboard.css", "dashboard.css"), ("goaccess-warning.js", "goaccess-warning.js")):
            destination = report_directory / target
            temporary = destination.with_suffix(".tmp")
            shutil.copyfile(Path(__file__).with_name(source), temporary)
            os.chmod(temporary, 0o644)
            os.replace(temporary, destination)
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--log-directory", type=Path, default=Path("/var/log/caddy"))
    parser.add_argument("--state-directory", type=Path, default=Path("/var/lib/roetgesportal-analytics"))
    parser.add_argument("--report-directory", type=Path, default=Path("/var/www/goaccess"))
    parser.add_argument("--check-fresh", action="store_true")
    arguments = parser.parse_args()
    try:
        refresh = int(os.environ.get("ANALYTICS_REFRESH_SECONDS", "300"))
        if not 60 <= refresh <= 300:
            raise ValueError("Invalid refresh interval")
        if arguments.check_fresh:
            if not (arguments.report_directory / "index.html").is_file():
                raise ValueError("Missing dashboard")
            report = json.loads((arguments.report_directory / "stats.json").read_text())
            age = datetime.now(UTC) - datetime.fromisoformat(report["generatedAt"])
            if not timedelta(0) <= age <= timedelta(seconds=2 * refresh + 60):
                raise ValueError("Stale report")
        else:
            generate(arguments.log_directory, arguments.state_directory, arguments.report_directory,
                     refresh_seconds=refresh)
    except Exception as error:
        # Source contents and private configuration must never enter job logs.
        print(f"Analytics update failed ({type(error).__name__}); previous report retained.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
