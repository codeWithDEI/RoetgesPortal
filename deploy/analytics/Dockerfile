FROM allinurl/goaccess:1.11

# Extend the existing offline report job; no additional service or database.
RUN apk add --no-cache python3
COPY update-report.sh aggregate.py dashboard.html dashboard.js dashboard.css goaccess-warning.js /opt/roetgesportal/
ENTRYPOINT ["/bin/sh", "/opt/roetgesportal/update-report.sh"]
