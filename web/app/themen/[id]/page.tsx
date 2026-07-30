import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import {
  categoryLabel,
  formatDate,
  milestoneStatusLabels,
  sourceTypeLabels,
} from "@/lib/presentation";
import { getTopic, topics } from "@/lib/topics";

type TopicPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return topics.map((topic) => ({ id: topic.id }));
}

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const { id } = await params;
  const topic = getTopic(id);

  if (!topic) {
    return { title: "Thema nicht gefunden" };
  }

  return {
    title: topic.title,
    description: topic.summary.trim(),
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { id } = await params;
  const topic = getTopic(id);

  if (!topic) notFound();

  const paragraphs = (topic.description ?? topic.summary)
    .trim()
    .split(/\n{2,}/);

  return (
    <>
      <SiteHeader />
      <main className="topic-detail">
        <div className="topic-detail__shell">
          <Link className="back-link" href="/themen">
            <span aria-hidden="true">←</span>
            Alle Themen
          </Link>

          <header className="topic-detail__header">
            <div>
              <StatusBadge status={topic.status} />
              <h1>{topic.title}</h1>
              <p>{topic.summary}</p>
            </div>
            <dl className="topic-facts">
              <div>
                <dt>Zuletzt aktualisiert</dt>
                <dd>{formatDate(topic.dates.updatedAt)}</dd>
              </div>
              <div>
                <dt>Zuletzt geprüft</dt>
                <dd>{formatDate(topic.dates.lastVerifiedAt)}</dd>
              </div>
              <div>
                <dt>Quellen</dt>
                <dd>{topic.sources.length}</dd>
              </div>
            </dl>
          </header>

          <div className="topic-detail__layout">
            <article className="topic-detail__article">
              <section>
                <p className="section-index">01 · Sachstand</p>
                <h2>Worum geht es?</h2>
                <div className="prose">
                  {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>

              {topic.milestones.length > 0 ? (
                <section>
                  <p className="section-index">02 · Verlauf</p>
                  <h2>Was ist bisher passiert?</h2>
                  <ol className="timeline">
                    {[...topic.milestones]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((milestone) => (
                        <li key={`${milestone.date}-${milestone.title}`}>
                          <div className="timeline__marker" aria-hidden="true" />
                          <div className="timeline__date">
                            {formatDate(milestone.date)}
                          </div>
                          <div className="timeline__content">
                            <span>{milestoneStatusLabels[milestone.status]}</span>
                            <h3>{milestone.title}</h3>
                            {milestone.description ? (
                              <p>{milestone.description}</p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                  </ol>
                </section>
              ) : null}

              <section>
                <p className="section-index">03 · Belege</p>
                <h2>Öffentliche Quellen</h2>
                <p className="section-intro">
                  Die folgenden Dokumente bilden die Grundlage dieser
                  Zusammenfassung.
                </p>
                <ul className="source-list">
                  {topic.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span>
                          <small>
                            {sourceTypeLabels[source.sourceType]}
                            {source.publishedAt
                              ? ` · ${formatDate(source.publishedAt)}`
                              : ""}
                          </small>
                          <strong>{source.title}</strong>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </article>

            <aside className="topic-detail__aside">
              <div className="aside-block">
                <p className="eyebrow">Themenbereiche</p>
                <ul className="detail-tags">
                  {topic.categories.map((category) => (
                    <li key={category}>{categoryLabel(category)}</li>
                  ))}
                </ul>
              </div>
              <div className="aside-block aside-block--note">
                <p className="eyebrow">Einordnung</p>
                <strong>Neutral zusammengefasst</strong>
                <p>
                  Der Text beschreibt den öffentlich belegten Sachstand. Eine
                  politische Bewertung wird nicht ergänzt.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
