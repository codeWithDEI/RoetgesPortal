import { categoryLabel } from "@/lib/presentation";
import {
  latestUpdateDate,
  topicsByRecentUpdate,
} from "@/lib/topics";

const SITE_ORIGIN = "https://roetgesportal.de";
const FEED_ITEM_LIMIT = 25;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rfc822Date(value: string): string {
  return new Date(`${value}T00:00:00Z`).toUTCString();
}

export function GET() {
  const items = topicsByRecentUpdate
    .slice(0, FEED_ITEM_LIMIT)
    .map((topic) => {
      const topicUrl = `${SITE_ORIGIN}/themen/${topic.id}`;
      const categories = topic.categories
        .map(
          (category) =>
            `      <category>${escapeXml(categoryLabel(category))}</category>`,
        )
        .join("\n");

      return `    <item>
      <title>${escapeXml(topic.title)}</title>
      <link>${topicUrl}</link>
      <guid isPermaLink="true">${topicUrl}</guid>
      <pubDate>${rfc822Date(topic.dates.updatedAt)}</pubDate>
      <description>${escapeXml(topic.summary.trim())}</description>
${categories}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>RötgesPortal – Neu und aktualisiert</title>
    <link>${SITE_ORIGIN}/neu</link>
    <description>Neue und aktualisierte kommunale Themen aus Rötgesbüttel und der Samtgemeinde Papenteich.</description>
    <language>de-DE</language>
    <lastBuildDate>${rfc822Date(latestUpdateDate)}</lastBuildDate>
    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=3600",
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
