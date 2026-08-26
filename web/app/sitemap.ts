import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { latestVerificationDate, topics } from "@/lib/topics";

const staticRoutes = [
  "",
  "/karte",
  "/projekt",
  "/barrierefreiheit",
  "/datenschutz",
  "/impressum",
  "/kontakt",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((pathname) => ({
    url: absoluteUrl(pathname || "/"),
    lastModified: pathname === "" ? latestVerificationDate : undefined,
  }));
  const topicEntries: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: absoluteUrl(`/themen/${topic.id}`),
    lastModified: topic.dates.updatedAt,
  }));

  return [...staticEntries, ...topicEntries];
}
