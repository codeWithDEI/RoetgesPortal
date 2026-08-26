# Search discovery

RötgesPortal publishes one canonical HTTPS origin and exposes the discovery
files that search engines need without adding third-party tracking:

- `https://roetgesportal.de/sitemap.xml` lists the canonical overview, public
  information pages, and every published topic;
- `https://roetgesportal.de/robots.txt` permits public pages, excludes runtime
  API and generated data paths, and points to the sitemap;
- every indexable page declares its canonical production URL;
- the overview identifies the site through `WebSite` structured data;
- topic pages expose source-backed `Article` and `BreadcrumbList` structured
  data.

The legacy `/themen` route intentionally declares `/` as its canonical URL
because both routes render the same topic overview. Public navigation links to
the canonical route. The `www` and `preview` hosts redirect to the canonical
origin at the reverse proxy.

## Google Search Console setup

1. Add `roetgesportal.de` as a domain property in Google Search Console.
2. Copy the generated DNS verification value without sharing it in an issue,
   pull request, or repository file.
3. Add the value at INWX as a TXT record for the domain apex.
4. Wait for DNS propagation and complete ownership verification in Search
   Console.
5. Submit `https://roetgesportal.de/sitemap.xml` in the Sitemaps report.
6. Inspect the home page and two representative topic URLs with URL Inspection.
7. Review indexing errors and search performance periodically; do not change
   editorial content merely to manufacture search traffic.

The DNS verification record can remain in place. It contains no login secret,
but repository history is still the wrong place to manage provider-specific
verification values.

## Release checks

After a production deployment, confirm that:

- the sitemap and robots routes return successful responses;
- sitemap URLs use `https://roetgesportal.de` and do not include preview hosts;
- archived and draft topics are absent;
- topic `lastmod` values reflect the editorial `updatedAt` field;
- canonical links and structured data match the visible page;
- the reverse proxy still redirects alternate hosts to the canonical origin.
