import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TopicExplorer } from "@/components/topic-explorer";
import { DEFAULT_AREA_ID, filterAreas } from "@/lib/areas";
import { formatDate } from "@/lib/presentation";
import {
  councilTopics,
  isRoetgesbuettelCouncilTopic,
  topicFacets,
} from "@/lib/topics";

export const metadata: Metadata = {
  title: "Kommunale Themen im Überblick",
  description:
    "Aktuelle Themen aus dem Gemeinderat Rötgesbüttel – mit optionaler Samtgemeinde-Sicht, Bearbeitungsstand und Originalquellen.",
};

const visibleAreas = filterAreas(topicFacets.areas);
const defaultCouncilTopics = councilTopics.filter(
  (topic) =>
    topic.relevantAreaIds.includes(DEFAULT_AREA_ID) &&
    isRoetgesbuettelCouncilTopic(topic),
);
const defaultCouncilLatestVerificationDate = defaultCouncilTopics.reduce(
  (latest, topic) =>
    topic.dates.lastVerifiedAt > latest
      ? topic.dates.lastVerifiedAt
      : latest,
  "",
);

export default function TopicsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero">
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="eyebrow">Rötgesbüttel im Blick</p>
              <h1>
                Was bewegt
                <br />
                unseren Ort?
              </h1>
              <p className="hero__intro">
                Aktuelle Themen aus dem Gemeinderat Rötgesbüttel – verständlich
                zusammengefasst und direkt belegt. Themen der Samtgemeinde
                können gezielt hinzugenommen werden.
              </p>
            </div>
            <aside className="hero__principle" aria-label="Unser Grundsatz">
              <span className="hero__principle-number">01</span>
              <div>
                <strong>Fakten vor Bewertung.</strong>
                <p>
                  Wir trennen Sachstand, Auswirkungen und politische
                  Positionen sichtbar voneinander.
                </p>
              </div>
            </aside>
          </div>
          <div className="hero__baseline">
            <span>
              {defaultCouncilTopics.length} Themen aus dem Gemeinderat
            </span>
            <span>
              Stand: {formatDate(defaultCouncilLatestVerificationDate)}
            </span>
            <span>Quellen direkt verlinkt</span>
          </div>
        </section>

        <div className="page-shell">
          <TopicExplorer
            areas={visibleAreas}
            categories={topicFacets.categories}
            items={councilTopics}
            statuses={topicFacets.status}
          />

          <section className="transparency-note">
            <div>
              <p className="eyebrow">Nachvollziehbar bleiben</p>
              <h2>Woher stammen die Informationen?</h2>
            </div>
            <p>
              Grundlage sind öffentliche Vorlagen, Tagesordnungen,
              Protokolle und Beschlüsse aus dem Ratsinformationssystem der
              Samtgemeinde Papenteich. Jede Zusammenfassung führt direkt zu
              ihren Quellen.
            </p>
            <Link href="/themen#topic-list-heading">
              Themen mit Quellen ansehen
              <span aria-hidden="true">↗</span>
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
