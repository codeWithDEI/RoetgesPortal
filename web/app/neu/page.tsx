import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import {
  categoryLabel,
  formatCompactDate,
  formatDate,
  topicAreaLabel,
} from "@/lib/presentation";
import { latestUpdateDate, topicsByRecentUpdate } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Neu und aktualisiert",
  description:
    "Chronologische Übersicht neuer und aktualisierter Themen im RötgesPortal.",
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export default function UpdatesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="updates-hero">
          <div className="updates-hero__inner">
            <div>
              <p className="eyebrow">Änderungen im Überblick</p>
              <h1>Neu &amp; aktualisiert</h1>
            </div>
            <p>
              Diese Chronik zeigt, welche Themen zuletzt ergänzt oder auf
              einen neuen Sachstand gebracht wurden. Maßgeblich ist das
              redaktionelle Aktualisierungsdatum des jeweiligen Themas.
            </p>
          </div>
          <div className="updates-hero__baseline">
            <span>{topicsByRecentUpdate.length} veröffentlichte Themen</span>
            <span>Letzte Änderung: {formatDate(latestUpdateDate)}</span>
            <a href="/feed.xml" type="application/rss+xml">
              RSS-Feed abonnieren
            </a>
          </div>
        </section>

        <div className="updates-page-shell">
          <section aria-labelledby="updates-heading">
            <div className="updates-heading">
              <div>
                <p className="eyebrow">Chronologisch sortiert</p>
                <h2 id="updates-heading">Zuletzt bearbeitet</h2>
              </div>
              <p>
                „Aktualisiert“ bezeichnet eine inhaltliche Änderung am
                dokumentierten Sachstand. Das separate Prüfdatum auf der
                Detailseite zeigt, wann die Quellen zuletzt kontrolliert
                wurden.
              </p>
            </div>

            <div className="topic-list">
              {topicsByRecentUpdate.map((topic) => (
                <article className="topic-card" key={topic.id}>
                  <div className="topic-card__meta">
                    <StatusBadge status={topic.status} />
                    <span>
                      Aktualisiert am {formatCompactDate(topic.dates.updatedAt)}
                    </span>
                    <span>Betrifft: {topicAreaLabel(topic.areas)}</span>
                  </div>
                  <div className="topic-card__content">
                    <h3>
                      <Link href={`/themen/${topic.id}`}>{topic.title}</Link>
                    </h3>
                    <p>{topic.summary}</p>
                  </div>
                  <div className="topic-card__footer">
                    <ul className="tag-list" aria-label="Themenbereiche">
                      {topic.categories.slice(0, 3).map((category) => (
                        <li key={category}>{categoryLabel(category)}</li>
                      ))}
                    </ul>
                    <Link
                      className="topic-card__link"
                      href={`/themen/${topic.id}`}
                    >
                      Details
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="feed-callout" aria-labelledby="feed-heading">
            <div>
              <p className="eyebrow">Ohne Konto auf dem Laufenden bleiben</p>
              <h2 id="feed-heading">Änderungen per RSS abonnieren</h2>
            </div>
            <div>
              <p>
                Der Feed enthält die 25 zuletzt aktualisierten Themen und kann
                mit üblichen RSS-Readern abonniert werden. Dabei ist weder ein
                Benutzerkonto noch eine E-Mail-Adresse erforderlich.
              </p>
              <a href="/feed.xml" type="application/rss+xml">
                RSS-Feed öffnen <span aria-hidden="true">↗</span>
              </a>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
