"""Optional end-to-end test against the pinned Caddy binary (CADDY_BINARY).

This verifies filters and privacy at the log-writing boundary, while serving
every filtered request normally. No production configuration or logs are read.
"""

from datetime import datetime, timezone
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
import unittest

from test_analytics import analytics, ROOT


def free_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


class ResponseHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        status = {"/projekt": 302, "/themen/not-found": 404, "/datenschutz": 304}.get(self.path, 200)
        self.send_response(status)
        if status != 304:
            self.send_header("Content-Type", "text/x-component" if self.path == "/neu" else "text/html; charset=utf-8")
        self.end_headers()
        if status != 304:
            self.wfile.write(b"<!doctype html><h1>Synthetic analytics verification</h1>")

    do_HEAD = do_GET

    def log_message(self, *_arguments):
        pass


@unittest.skipUnless(os.environ.get("CADDY_BINARY"), "Set CADDY_BINARY for proxy integration verification")
class CaddyAnalyticsTests(unittest.TestCase):
    def test_serving_filters_redaction_and_exact_counts(self):
        import yaml
        compose = yaml.safe_load((ROOT / "deploy/compose.yaml").read_text())
        expected_version = compose["services"]["proxy"]["image"].split(":")[1].removesuffix("-alpine")
        actual_version = subprocess.check_output([os.environ["CADDY_BINARY"], "version"], text=True).split()[0].removeprefix("v")
        self.assertEqual(actual_version, expected_version, "Verify with the same Caddy version as deployment")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            logs = root / "logs"
            logs.mkdir()
            with ThreadingHTTPServer(("127.0.0.1", 0), ResponseHandler) as backend:
                thread = threading.Thread(target=backend.serve_forever, daemon=True)
                thread.start()
                port, redirect = free_port(), free_port()
                config = (ROOT / "deploy/Caddyfile").read_text()
                config = "{\n admin off\n auto_https off\n}\n" + config
                config = config.replace("{$SITE_ADDRESS:http://localhost}", f"http://127.0.0.1:{port}")
                config = config.replace("{$REDIRECT_SITE_ADDRESSES:http://localhost:8081}", f"http://127.0.0.1:{redirect}")
                config = config.replace("/var/log/caddy", str(logs))
                config = config.replace("web:3000", f"127.0.0.1:{backend.server_port}")
                caddyfile = root / "Caddyfile"
                caddyfile.write_text(config)
                with (root / "caddy-errors.log").open("w") as diagnostics:
                    environment = {**os.environ, "XDG_DATA_HOME": str(root / "data"), "XDG_CONFIG_HOME": str(root / "config")}
                    # Remove operator overrides, if any; all inputs are synthetic.
                    for key in ("SITE_ADDRESS", "REDIRECT_SITE_ADDRESSES", "CANONICAL_ORIGIN"):
                        environment.pop(key, None)
                    process = subprocess.Popen([os.environ["CADDY_BINARY"], "run", "--config", str(caddyfile)],
                                               stdout=diagnostics, stderr=diagnostics, env=environment)
                    try:
                        deadline = time.monotonic() + 10
                        while True:
                            try:
                                with socket.create_connection(("127.0.0.1", port), timeout=.1):
                                    break
                            except OSError:
                                if process.poll() is not None or time.monotonic() > deadline:
                                    self.fail("Synthetic Caddy failed to start: " + (root / "caddy-errors.log").read_text())
                                time.sleep(.05)

                        def request(path, headers=None, method="GET"):
                            client = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
                            try:
                                client.request(method, path, headers={"User-Agent": "Mozilla/5.0 Test Browser", **(headers or {})})
                                response = client.getresponse()
                                response.read()
                                return response.status
                            finally:
                                client.close()

                        # Seven logged requests, four successful HTML fetches.
                        for path, expected in (("/", 200), ("/themen", 200),
                                               ("/themen/example-topic?token=private", 200),
                                               ("/neu", 200), ("/projekt", 302),
                                               ("/themen/not-found", 404), ("/datenschutz", 304)):
                            self.assertEqual(request(path), expected)
                        for path in ("/api/health", "/assets/app.js", "/data/topics.json", "/og.png", "/themen/example-topic.rsc", "/_next/test"):
                            self.assertEqual(request(path), 200)
                        for agent in ("Googlebot/2.1", "bingbot", "DuckDuckBot", "GPTBot", "facebookexternalhit", "UptimeRobot", "uptime-kuma/1.0", "curl/8.0", "Wget/1.2", "python-requests/2.0", "Go-http-client/1.1"):
                            self.assertEqual(request("/", {"User-Agent": agent}), 200)
                        for headers in ({"RSC": "1"}, {"Next-Router-Prefetch": "1"}, {"Purpose": "prefetch"},
                                        {"Sec-Purpose": "prefetch;prerender"}, {"Accept": "text/x-component"},
                                        {"X-Roetgesportal-Check": "1"}):
                            self.assertEqual(request("/", headers), 200)
                        self.assertEqual(request("/", method="HEAD"), 200)
                    finally:
                        process.terminate()
                        process.wait(timeout=10)
                        backend.shutdown()
                        thread.join(timeout=5)
                raw = (logs / "portal-access.log").read_text()
                records = [json.loads(line) for line in raw.splitlines()]
                self.assertEqual(len(records), 7)
                self.assertNotIn("token=private", raw)
                self.assertNotIn("Test Browser", raw)
                self.assertTrue(all(value["request"]["remote_ip"] == "0.0.0.0" for value in records))
                self.assertTrue(all("headers" not in value["request"] and "remote_port" not in value["request"] for value in records))
                self.assertTrue(all(value["analytics_policy"] == analytics.POLICY for value in records))
                report = analytics.generate(logs, root / "state", root / "report", now=datetime.now(timezone.utc))
                self.assertEqual(report["metrics"]["today"]["requests"], 7)
                self.assertEqual(report["metrics"]["today"]["pageviews"], 4)
                self.assertEqual(sum(row["legacyPageviews"] for row in report["days"]), 0)


if __name__ == "__main__":
    unittest.main()
