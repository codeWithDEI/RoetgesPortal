import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Über das Projekt",
  description:
    "Wie RötgesPortal kommunale Themen recherchiert, prüft und nachvollziehbar veröffentlicht.",
};

const workflow = [
  ["01", "Quellen prüfen", "Öffentliche Vorlagen, Tagesordnungen, Protokolle und Beschlüsse bilden die Grundlage."],
  ["02", "Neutral zusammenfassen", "Sachstand, mögliche Auswirkungen und belegte Positionen bleiben klar getrennt."],
  ["03", "Nachvollziehbar veröffentlichen", "Jedes Thema zeigt Quellen sowie das Datum der letzten inhaltlichen Prüfung."],
];

export default function ProjectPage() {
  return (
    <InfoPage
      eyebrow="Offen entwickelt"
      intro="RötgesPortal macht kommunale Vorgänge leichter zugänglich. Die Inhalte entstehen aus öffentlichen Quellen, werden versioniert gepflegt und bleiben technisch portabel."
      title="Transparenz, die man prüfen kann."
    >
      <section className="info-section">
        <p className="section-index">01 · Arbeitsweise</p>
        <h2>Von der öffentlichen Quelle zum verständlichen Thema</h2>
        <div className="principle-grid">
          {workflow.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">02 · Unabhängigkeit</p>
          <h2>Privat und unabhängig betrieben</h2>
        </div>
        <div className="info-prose">
          <p>
            RötgesPortal wird privat und unabhängig betrieben. Es ist keine
            offizielle Plattform der Gemeinde Rötgesbüttel und ersetzt weder
            amtliche Bekanntmachungen noch das Ratsinformationssystem oder die
            Website der Gemeinde.
          </p>
          <p>
            Die eigenständige Wort-Bild-Marke verbindet eine gefaltete Karte
            mit dem „R“ für Rötgesbüttel. Sie verwendet bewusst kein amtliches
            Gemeindesymbol und bedeutet keine offizielle Beauftragung oder
            Freigabe. Sollte die Gemeinde das Portal später übernehmen, sind
            Technik, Inhalte und Betriebsabläufe bereits auf eine geordnete
            Übergabe vorbereitet.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">03 · Redaktionelle Grundsätze</p>
          <h2>Sorgfalt soll öffentlich prüfbar sein</h2>
        </div>
        <div className="info-prose">
          <p>
            Primärquellen werden bevorzugt. Veröffentlichte Fakten müssen
            anhand einer Quelle nachvollziehbar sein; Sachstand, mögliche
            Auswirkungen und dokumentierte Positionen werden getrennt
            dargestellt.
          </p>
          <p>
            Meinung oder Kommentar wird nicht als Tatsache dargestellt und
            müsste bei einer späteren Einführung eindeutig gekennzeichnet
            werden. Veröffentlichte Themen zeigen ihre Quellen sowie das Datum
            der letzten Prüfung oder Aktualisierung.
          </p>
          <p>
            Fehler werden korrigiert. Mögliche politische, finanzielle oder
            persönliche Interessenkonflikte sollen bei der redaktionellen
            Prüfung berücksichtigt werden.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">04 · Offenheit</p>
          <h2>Fehler sollen auffallen dürfen</h2>
        </div>
        <div className="info-prose">
          <p>
            Inhalte und Änderungen sind im öffentlichen Repository
            nachvollziehbar. Hinweise auf fehlende Quellen, missverständliche
            Formulierungen oder sachliche Fehler sind ausdrücklich willkommen.
          </p>
          <div className="info-actions">
            <Link href="/kontakt">Korrektur vorschlagen</Link>
            <a href="https://github.com/codeWithDEI/RoetgesPortal" rel="noreferrer" target="_blank">
              Quellcode auf GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
    </InfoPage>
  );
}
