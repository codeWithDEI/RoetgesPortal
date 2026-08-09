#!/bin/sh

set -eu

readonly REPORT_DIRECTORY="/var/www/goaccess"
readonly REPORT_PATH="${REPORT_DIRECTORY}/index.html"
readonly TEMPORARY_REPORT_PATH="${REPORT_DIRECTORY}/index.tmp.html"
readonly REFRESH_SECONDS="${ANALYTICS_REFRESH_SECONDS:-300}"

write_empty_report() {
    printf '%s\n' \
        '<!doctype html>' \
        '<html lang="en">' \
        '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RötgesPortal page views</title></head>' \
        '<body><main><h1>RötgesPortal page views</h1><p>The first report will appear after the portal receives a page request.</p></main></body>' \
        > "${TEMPORARY_REPORT_PATH}"
    mv "${TEMPORARY_REPORT_PATH}" "${REPORT_PATH}"
}

generate_report() {
    # Caddy keeps the active file and up to six uncompressed daily rolls.
    # Expanding the glob here lets GoAccess rebuild a deterministic seven-day
    # window without retaining visitor identifiers in its own database.
    set -- /var/log/caddy/portal-access*.log

    if [ ! -e "$1" ]; then
        write_empty_report
        return
    fi

    /usr/bin/goaccess "$@" \
        --no-global-config \
        --log-format=CADDY \
        --no-query-string \
        --keep-last=7 \
        --tz=Europe/Berlin \
        --html-report-title="RötgesPortal page views — last 7 days" \
        --sort-panel=REQUESTS,BY_HITS,DESC \
        --ignore-panel=VISITORS \
        --ignore-panel=HOSTS \
        --ignore-panel=OS \
        --ignore-panel=BROWSERS \
        --ignore-panel=REFERRERS \
        --ignore-panel=REFERRING_SITES \
        --ignore-panel=KEYPHRASES \
        --ignore-panel=REMOTE_USER \
        --ignore-panel=GEO_LOCATION \
        --no-progress \
        --output="${TEMPORARY_REPORT_PATH}"

    mv "${TEMPORARY_REPORT_PATH}" "${REPORT_PATH}"
}

while true; do
    generate_report
    sleep "${REFRESH_SECONDS}" &
    wait "$!"
done
