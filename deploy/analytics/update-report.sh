#!/bin/sh

set -eu

readonly REPORT_DIRECTORY="/var/www/goaccess"
readonly REPORT_PATH="${REPORT_DIRECTORY}/goaccess.html"
readonly TEMPORARY_REPORT_PATH="${REPORT_DIRECTORY}/goaccess.tmp.html"
readonly REFRESH_SECONDS="${ANALYTICS_REFRESH_SECONDS:-300}"

case "${REFRESH_SECONDS}" in
    6[0-9]|7[0-9]|8[0-9]|9[0-9]|[12][0-9][0-9]|300) ;;
    *) printf '%s\n' 'ANALYTICS_REFRESH_SECONDS must be 60–300.' >&2; exit 2 ;;
esac

write_empty_report() {
    printf '%s\n' \
        '<!doctype html>' \
        '<html lang="de">' \
        '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RötgesPortal · Log-Requests</title></head>' \
        '<body><main><h1>RötgesPortal · Log-Requests</h1><p>Noch keine protokollierten Requests. Besucher sind nicht ermittelbar.</p><a href="index.html">Tagesübersicht</a></main></body>' \
        > "${TEMPORARY_REPORT_PATH}"
    mv "${TEMPORARY_REPORT_PATH}" "${REPORT_PATH}"
}

generate_report() {
    python3 /opt/roetgesportal/aggregate.py || return 1
    # Caddy keeps the active file and up to six uncompressed daily rolls.
    # Expanding the glob here lets GoAccess rebuild a deterministic seven-day
    # window without retaining visitor identifiers in its own database.
    set -- /var/log/caddy/portal-access*.log

    if [ ! -e "$1" ]; then
        write_empty_report
        return
    fi

    has_content=0
    for log_file in "$@"; do
        if [ -s "${log_file}" ]; then
            has_content=1
        fi
    done
    if [ "${has_content}" -eq 0 ]; then
        write_empty_report
        return
    fi

    /usr/bin/goaccess "$@" \
        --no-global-config \
        --log-format=CADDY \
        --no-query-string \
        --keep-last=7 \
        --tz=Europe/Berlin \
        --html-report-title="RötgesPortal Log-Requests — Besucherwerte ungültig" \
        --html-custom-js=goaccess-warning.js \
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
        --output="${TEMPORARY_REPORT_PATH}" || return 1

    mv "${TEMPORARY_REPORT_PATH}" "${REPORT_PATH}"
}

if [ "${1:-}" = "--once" ]; then
    generate_report
    exit
fi

while true; do
    if ! generate_report; then
        printf '%s\n' 'Analytics generation failed; check report freshness and retained logs.' >&2
    fi
    sleep "${REFRESH_SECONDS}" &
    wait "$!"
done
