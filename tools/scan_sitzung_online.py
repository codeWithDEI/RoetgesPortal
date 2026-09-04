"""Discover public ALLRIS agenda changes for editorial review.

The scanner deliberately writes a non-public review queue. It never creates or
updates published topics and it never reads non-public agenda sections.
"""

from __future__ import annotations

import argparse
import hashlib
import http.cookiejar
import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as error:
    raise SystemExit(
        "Scanner dependencies are missing. "
        "Run: python3 -m pip install -r requirements-dev.txt"
    ) from error


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = REPOSITORY_ROOT / "config/content-monitor.yaml"
DEFAULT_OUTPUT = REPOSITORY_ROOT / "content/review/sitzung-online.yaml"
DEFAULT_DECISIONS = (
    REPOSITORY_ROOT / "content/review/decisions/sitzung-online.yaml"
)
DEFAULT_SCHEMA = REPOSITORY_ROOT / "schemas/content-monitor.schema.json"
USER_AGENT = "RoetgesPortal content monitor (+https://roetgesportal.de/kontakt)"


class MonitorError(RuntimeError):
    """Raised when a scan cannot be completed without risking a false update."""


@dataclass(frozen=True)
class CalendarMeeting:
    meeting_id: str
    title: str
    meeting_date: str
    meeting_time: str
    url: str


@dataclass(frozen=True)
class AgendaItem:
    item_id: str
    number: str
    title: str
    detail_url: str
    proposal_id: str | None = None
    proposal_reference: str | None = None
    proposal_url: str | None = None


def normalize_text(value: str) -> str:
    """Collapse presentation whitespace without changing textual content."""
    return " ".join(value.split())


def query_identifier(url: str, name: str) -> str | None:
    values = parse_qs(urlparse(url).query).get(name, [])
    return values[0] if values else None


def extract_timer_url(document: str) -> str:
    """Return the Wicket callback URL that contains the populated calendar."""
    matches = re.findall(r'"u"\s*:\s*"([^"]*si010[^"]*)"', document)
    if not matches:
        raise MonitorError("calendar page does not expose its Wicket update URL")
    return (
        matches[-1]
        .replace(r"\/", "/")
        .replace(r"\u0026", "&")
        .replace("&amp;", "&")
    )


class CalendarParser(HTMLParser):
    """Extract stable meeting links from a populated ALLRIS calendar."""

    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.meetings: list[CalendarMeeting] = []
        self._anchor: dict[str, Any] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag != "a":
            return
        values = dict(attrs)
        anchor_id = values.get("id", "") or ""
        if not anchor_id.startswith("si_"):
            return
        self._anchor = {
            "id": anchor_id.removeprefix("si_"),
            "href": values.get("href", "") or "",
            "tooltip": values.get("data-simpletooltip-text", "") or "",
            "text": [],
        }

    def handle_data(self, data: str) -> None:
        if self._anchor is not None:
            self._anchor["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or self._anchor is None:
            return

        tooltip = normalize_text(self._anchor["tooltip"])
        date_match = re.search(
            r"(\d{2})\.(\d{2})\.(\d{4}).*?um\s+(\d{2}:\d{2})\s+Uhr",
            tooltip,
        )
        href = self._anchor["href"]
        meeting_id = query_identifier(href, "SILFDNR") or self._anchor["id"]
        if date_match and href and meeting_id:
            day, month, year, meeting_time = date_match.groups()
            self.meetings.append(
                CalendarMeeting(
                    meeting_id=meeting_id,
                    title=normalize_text("".join(self._anchor["text"])),
                    meeting_date=f"{year}-{month}-{day}",
                    meeting_time=meeting_time,
                    url=urljoin(self.base_url, href),
                )
            )
        self._anchor = None


def parse_calendar(document: str, base_url: str) -> list[CalendarMeeting]:
    parser = CalendarParser(base_url)
    parser.feed(document)
    return parser.meetings


class MeetingParser(HTMLParser):
    """Extract only agenda items explicitly listed in a public section."""

    def __init__(self, meeting_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.meeting_url = meeting_url
        self.body_id: str | None = None
        self.body_name: str | None = None
        self.saw_agenda_table = False
        self.items: list[AgendaItem] = []
        self._public_section = False
        self._in_body = False
        self._in_row = False
        self._cell_class = ""
        self._row_text: list[str] = []
        self._cell_text: dict[str, list[str]] = {}
        self._row_anchors: list[dict[str, Any]] = []
        self._anchor: dict[str, Any] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = dict(attrs)
        if tag == "table" and values.get("id") == "toTreeTable":
            self.saw_agenda_table = True
        elif tag == "span" and values.get("id") == "sigremium":
            self._in_body = True
        elif tag == "tr":
            self._in_row = True
            self._cell_class = ""
            self._row_text = []
            self._cell_text = {}
            self._row_anchors = []
        elif tag in {"td", "th"} and self._in_row:
            self._cell_class = values.get("class", "") or ""
            self._cell_text.setdefault(self._cell_class, [])
        elif tag == "a":
            anchor_id = values.get("id", "") or ""
            if self._in_body or anchor_id.startswith(("betreff_", "vo_")):
                self._anchor = {
                    "id": anchor_id,
                    "href": values.get("href", "") or "",
                    "cell": self._cell_class,
                    "text": [],
                    "body": self._in_body,
                }

    def handle_data(self, data: str) -> None:
        if self._in_row:
            self._row_text.append(data)
            if self._cell_class:
                self._cell_text.setdefault(self._cell_class, []).append(data)
        if self._anchor is not None:
            self._anchor["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._anchor is not None:
            anchor = self._anchor
            anchor["text"] = normalize_text("".join(anchor["text"]))
            if anchor["body"]:
                self.body_id = query_identifier(anchor["href"], "GRLFDNR")
                self.body_name = anchor["text"]
            if self._in_row:
                self._row_anchors.append(anchor)
            self._anchor = None
        elif tag == "span" and self._in_body:
            self._in_body = False
        elif tag in {"td", "th"} and self._in_row:
            self._cell_class = ""
        elif tag == "tr" and self._in_row:
            self._finish_row()
            self._in_row = False

    def _finish_row(self) -> None:
        row_text = normalize_text("".join(self._row_text))
        if "Nichtöffentlicher Teil" in row_text:
            self._public_section = False
            return
        if "Öffentlicher Teil" in row_text:
            self._public_section = True
            return
        if not self._public_section:
            return

        subject = next(
            (
                anchor
                for anchor in self._row_anchors
                if anchor["id"].startswith("betreff_")
            ),
            None,
        )
        if subject is None:
            return

        item_id = subject["id"].removeprefix("betreff_")
        number = ""
        for cell_class, values in self._cell_text.items():
            if "tonr" not in cell_class.split():
                continue
            number_match = re.search(r"\d+(?:\.\d+)*", normalize_text("".join(values)))
            if number_match:
                number = number_match.group(0)
                break

        proposal = next(
            (
                anchor
                for anchor in self._row_anchors
                if anchor["id"].startswith("vo_")
            ),
            None,
        )
        proposal_id = None
        proposal_reference = None
        proposal_url = None
        if proposal is not None:
            proposal_id = query_identifier(proposal["href"], "VOLFDNR")
            proposal_reference = proposal["text"] or None
            proposal_url = urljoin(self.meeting_url, proposal["href"])

        detail_url = urljoin(
            self.meeting_url,
            f"to020?TOLFDNR={item_id}&SILFDNR="
            f"{query_identifier(self.meeting_url, 'SILFDNR') or ''}",
        )
        self.items.append(
            AgendaItem(
                item_id=item_id,
                number=number,
                title=subject["text"],
                detail_url=detail_url,
                proposal_id=proposal_id,
                proposal_reference=proposal_reference,
                proposal_url=proposal_url,
            )
        )


def parse_meeting(document: str, meeting_url: str) -> MeetingParser:
    parser = MeetingParser(meeting_url)
    parser.feed(document)
    return parser


class ContentMonitorClient:
    """Small, polite HTTP client restricted to the configured HTTPS host."""

    def __init__(self, base_url: str, delay: float, timeout: int) -> None:
        parsed = urlparse(base_url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise MonitorError("baseUrl must be an absolute HTTPS URL")
        self.base_url = base_url
        self.hostname = parsed.hostname
        self.delay = delay
        self.timeout = timeout
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

    def get(self, url: str) -> str:
        absolute_url = urljoin(self.base_url, url)
        parsed = urlparse(absolute_url)
        if parsed.scheme != "https" or parsed.hostname != self.hostname:
            raise MonitorError(f"refusing to request an untrusted URL: {absolute_url}")

        last_error: Exception | None = None
        for attempt in range(3):
            request = urllib.request.Request(
                absolute_url,
                headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
            )
            try:
                with self.opener.open(request, timeout=self.timeout) as response:
                    charset = response.headers.get_content_charset() or "utf-8"
                    content = response.read().decode(charset, errors="replace")
                if self.delay:
                    time.sleep(self.delay)
                return content
            except (OSError, urllib.error.URLError) as error:
                last_error = error
                if attempt < 2:
                    time.sleep(2**attempt)
        raise MonitorError(f"request failed after three attempts: {absolute_url}") from last_error

    def calendar(self, year: int, month: int) -> list[CalendarMeeting]:
        calendar_url = urljoin(self.base_url, f"si010?MM={month}&YY={year}")
        initial = self.get(calendar_url)
        callback_url = urljoin(calendar_url, extract_timer_url(initial))
        populated = self.get(callback_url)
        return parse_calendar(populated, self.base_url)


def load_yaml_mapping(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        value = yaml.safe_load(file)
    if not isinstance(value, dict):
        raise MonitorError(f"expected a YAML mapping in {path}")
    return value


def load_config(path: Path, schema_path: Path = DEFAULT_SCHEMA) -> dict[str, Any]:
    config = load_yaml_mapping(path)
    with schema_path.open("r", encoding="utf-8") as file:
        schema = json.load(file)
    errors = sorted(
        Draft202012Validator(schema).iter_errors(config),
        key=lambda error: tuple(str(part) for part in error.path),
    )
    if errors:
        details = "; ".join(
            f"{'.'.join(str(part) for part in error.path) or '<root>'}: "
            f"{error.message}"
            for error in errors
        )
        raise MonitorError(f"invalid monitor configuration: {details}")
    return config


def months_for_scan(today: date, count: int) -> list[tuple[int, int]]:
    result: list[tuple[int, int]] = []
    current = today.year * 12 + today.month - 1
    for offset in reversed(range(count)):
        year, zero_based_month = divmod(current - offset, 12)
        result.append((year, zero_based_month + 1))
    return result


def topic_source_index(topic_directory: Path) -> dict[str, dict[str, set[str]]]:
    index = {"TOLFDNR": {}, "VOLFDNR": {}}
    for path in sorted(topic_directory.glob("*.yaml")):
        topic = load_yaml_mapping(path)
        topic_id = topic.get("id")
        if not isinstance(topic_id, str):
            continue
        for source in topic.get("sources", []):
            if not isinstance(source, dict) or not isinstance(source.get("url"), str):
                continue
            for parameter in index:
                identifier = query_identifier(source["url"], parameter)
                if identifier:
                    index[parameter].setdefault(identifier, set()).add(topic_id)
    return index


def matching_topics(
    item: AgendaItem, index: dict[str, dict[str, set[str]]]
) -> list[str]:
    matches = set(index["TOLFDNR"].get(item.item_id, set()))
    if item.proposal_id:
        matches.update(index["VOLFDNR"].get(item.proposal_id, set()))
    return sorted(matches)


def is_configured_body_name(
    body_name: str | None, bodies: dict[str, dict[str, str]]
) -> bool:
    """Recognize configured bodies when ALLRIS omits their stable identifier."""
    normalized = normalize_text(body_name or "").casefold()
    configured_names = {
        normalize_text(body["name"]).casefold() for body in bodies.values()
    }
    return "rötgesbüttel" in normalized or normalized in configured_names


def item_fingerprint(item: AgendaItem) -> str:
    payload = {
        "id": item.item_id,
        "number": item.number,
        "title": item.title,
        "detailUrl": item.detail_url,
        "proposalId": item.proposal_id,
        "proposalReference": item.proposal_reference,
        "proposalUrl": item.proposal_url,
    }
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def build_meeting_record(
    meeting: CalendarMeeting,
    parsed: MeetingParser,
    body: dict[str, str],
    ignored_patterns: list[re.Pattern[str]],
    source_index: dict[str, dict[str, set[str]]],
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    for item in parsed.items:
        if item.proposal_id is None and any(
            pattern.search(item.title) for pattern in ignored_patterns
        ):
            continue
        matches = matching_topics(item, source_index)
        record: dict[str, Any] = {
            "id": item.item_id,
            "number": item.number,
            "title": item.title,
            "detailUrl": item.detail_url,
        }
        if item.proposal_id:
            record["proposal"] = {
                "id": item.proposal_id,
                "reference": item.proposal_reference,
                "url": item.proposal_url,
            }
        record["matchedTopicIds"] = matches
        record["reviewStatus"] = "tracked" if matches else "new"
        record["fingerprint"] = item_fingerprint(item)
        items.append(record)

    return {
        "id": meeting.meeting_id,
        "title": meeting.title,
        "date": meeting.meeting_date,
        "time": meeting.meeting_time,
        "url": meeting.url,
        "body": {
            "id": parsed.body_id,
            "name": body["name"],
            "level": body["level"],
        },
        "area": body["area"],
        "agendaItems": items,
    }


def merge_queue(
    previous: dict[str, Any] | None,
    scanned: list[dict[str, Any]],
    scanned_months: set[tuple[int, int]],
    source_id: str,
    base_url: str,
) -> dict[str, Any]:
    retained: list[dict[str, Any]] = []
    if previous:
        for meeting in previous.get("meetings", []):
            meeting_date = date.fromisoformat(meeting["date"])
            if (meeting_date.year, meeting_date.month) not in scanned_months:
                retained.append(meeting)

    meetings = [*retained, *scanned]
    meetings.sort(
        key=lambda meeting: (
            meeting["date"],
            meeting["time"],
            meeting["body"]["id"],
            meeting["id"],
        )
    )
    return {
        "id": "sitzung-online",
        "type": "contentReviewQueue",
        "version": 1,
        "source": {"id": source_id, "baseUrl": base_url},
        "publicAgendaOnly": True,
        "meetings": meetings,
    }


def decision_index(
    decisions: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    """Index human decisions separately from the generated review queue."""
    return {
        item["candidateId"]: item
        for item in (decisions or {}).get("items", [])
        if isinstance(item, dict) and isinstance(item.get("candidateId"), str)
    }


def queue_report(
    previous: dict[str, Any] | None,
    current: dict[str, Any],
    decisions: dict[str, Any] | None = None,
) -> str:
    def meetings(queue: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
        return {meeting["id"]: meeting for meeting in (queue or {}).get("meetings", [])}

    def items(queue: dict[str, Any] | None) -> dict[tuple[str, str], dict[str, Any]]:
        result: dict[tuple[str, str], dict[str, Any]] = {}
        for meeting in (queue or {}).get("meetings", []):
            for item in meeting.get("agendaItems", []):
                result[(meeting["id"], item["id"])] = item
        return result

    old_meetings = meetings(previous)
    new_meetings = meetings(current)
    old_items = items(previous)
    new_items = items(current)
    added = sorted(new_items.keys() - old_items.keys())
    removed = sorted(old_items.keys() - new_items.keys())
    changed = sorted(
        key
        for key in new_items.keys() & old_items.keys()
        if new_items[key] != old_items[key]
    )

    decisions_by_id = decision_index(decisions)
    unreviewed: list[tuple[str, str]] = []
    stale: list[tuple[str, str]] = []
    planned: list[tuple[str, str]] = []
    no_topic: list[tuple[str, str]] = []
    deferred: list[tuple[str, str]] = []
    for key, item in new_items.items():
        if item.get("reviewStatus") != "new":
            continue
        candidate_id = f"{key[0]}/{key[1]}"
        decision = decisions_by_id.get(candidate_id)
        if decision is None:
            unreviewed.append(key)
        elif decision.get("reviewedFingerprint") != item.get("fingerprint"):
            stale.append(key)
        elif decision.get("decision") in {"create-topic", "update-topic"}:
            planned.append(key)
        elif decision.get("decision") == "no-topic":
            no_topic.append(key)
        elif decision.get("decision") == "defer":
            deferred.append(key)

    actionable = sorted([*unreviewed, *stale, *planned])
    lines = [
        "# Content monitor result",
        "",
        f"- Meetings in review queue: {len(new_meetings)}",
        f"- New public agenda candidates: {len(added)}",
        f"- Changed candidates: {len(changed)}",
        f"- Removed candidates: {len(removed)}",
        f"- Candidates requiring editorial action: {len(actionable)}",
        f"- Unreviewed candidates: {len(unreviewed)}",
        f"- Planned topic changes: {len(planned)}",
        f"- Stale editorial decisions: {len(stale)}",
        f"- Decisions recorded as no topic: {len(no_topic)}",
        f"- Deferred candidates: {len(deferred)}",
    ]
    if added:
        lines.extend(["", "## New source candidates"])
        for meeting_id, item_id in added:
            item = new_items[(meeting_id, item_id)]
            lines.append(f"- `{meeting_id}/{item_id}` — {item['title']}")
    if changed:
        lines.extend(["", "## Changed source candidates"])
        for meeting_id, item_id in changed:
            item = new_items[(meeting_id, item_id)]
            lines.append(f"- `{meeting_id}/{item_id}` — {item['title']}")
    if removed:
        lines.extend(["", "## Removed source candidates"])
        for meeting_id, item_id in removed:
            item = old_items[(meeting_id, item_id)]
            lines.append(f"- `{meeting_id}/{item_id}` — {item['title']}")
    if actionable:
        lines.extend(["", "## Editorial action required"])
        for meeting_id, item_id in actionable:
            item = new_items[(meeting_id, item_id)]
            candidate_id = f"{meeting_id}/{item_id}"
            decision = decisions_by_id.get(candidate_id)
            if (meeting_id, item_id) in unreviewed:
                label = "unreviewed"
            elif (meeting_id, item_id) in stale:
                label = "source changed since review"
            else:
                label = decision["decision"]
                if decision.get("topicId"):
                    label += f" → {decision['topicId']}"
            lines.append(f"- `{candidate_id}` ({label}) — {item['title']}")
    lines.extend(
        [
            "",
            "The queue is not published. Every candidate still requires editorial",
            "verification and a separate topic pull request.",
            "",
        ]
    )
    return "\n".join(lines)


def write_yaml(path: Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        yaml.safe_dump(
            document,
            allow_unicode=True,
            sort_keys=False,
            width=1000,
        ),
        encoding="utf-8",
    )
    temporary.replace(path)


def scan(
    config: dict[str, Any],
    output: Path,
    today: date,
    months: int | None = None,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    months_to_read = months or config["lookbackMonths"]
    scan_months = months_for_scan(today, months_to_read)
    client = ContentMonitorClient(
        config["baseUrl"],
        config["requestDelaySeconds"],
        config["requestTimeoutSeconds"],
    )
    source_index = topic_source_index(REPOSITORY_ROOT / "content/topics")
    ignored_patterns = [
        re.compile(pattern, re.IGNORECASE)
        for pattern in config["ignoredAgendaTitlePatterns"]
    ]

    discovered: dict[str, CalendarMeeting] = {}
    for year, month in scan_months:
        for meeting in client.calendar(year, month):
            discovered[meeting.meeting_id] = meeting

    scanned: list[dict[str, Any]] = []
    for meeting in sorted(
        discovered.values(),
        key=lambda value: (value.meeting_date, value.meeting_time, value.meeting_id),
    ):
        parsed = parse_meeting(client.get(meeting.url), meeting.url)
        if parsed.body_id is None:
            if is_configured_body_name(parsed.body_name, config["bodies"]):
                raise MonitorError(
                    f"configured meeting does not expose its body identifier: "
                    f"{meeting.url}"
                )
            continue
        if parsed.body_id not in config["bodies"]:
            continue
        if not parsed.saw_agenda_table:
            raise MonitorError(
                f"configured meeting does not expose its agenda table: {meeting.url}"
            )
        scanned.append(
            build_meeting_record(
                meeting,
                parsed,
                config["bodies"][parsed.body_id],
                ignored_patterns,
                source_index,
            )
        )

    previous = load_yaml_mapping(output) if output.exists() else None
    current = merge_queue(
        previous,
        scanned,
        set(scan_months),
        config["sourceId"],
        config["baseUrl"],
    )
    write_yaml(output, current)
    return current, previous


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect public ALLRIS agenda changes for editorial review."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--decisions", type=Path, default=DEFAULT_DECISIONS)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--months", type=int)
    parser.add_argument("--today", type=date.fromisoformat, default=date.today())
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    if arguments.months is not None and arguments.months < 1:
        raise SystemExit("--months must be at least 1")
    config = load_config(arguments.config)
    current, previous = scan(
        config,
        arguments.output,
        arguments.today,
        arguments.months,
    )
    decisions = (
        load_yaml_mapping(arguments.decisions)
        if arguments.decisions.exists()
        else None
    )
    report = queue_report(previous, current, decisions)
    print(report)
    if arguments.report:
        arguments.report.parent.mkdir(parents=True, exist_ok=True)
        arguments.report.write_text(report, encoding="utf-8")


if __name__ == "__main__":
    main()
