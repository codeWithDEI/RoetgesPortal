import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Barrierefreiheit",
  description: "Hinweise zur Barrierefreiheit von RötgesPortal.",
};

export default function AccessibilityPage() {
  return (
    <InfoPage
      eyebrow="Zugänglich für alle"
      intro="Kommunale Informationen sollen unabhängig von Gerät, Sehvermögen oder Eingabemethode verständlich und bedienbar sein."
      title="Barrierefreiheit ist Teil des Fundaments."
    >
      <section className="info-section info-section--split">
        <div>
          <p className="section-index">01 · Aktueller Stand</p>
          <h2>Was bereits berücksichtigt wird</h2>
        </div>
        <div className="info-prose">
          <ul className="check-list">
            <li>Semantische Überschriften, Navigation und Inhaltsbereiche</li>
            <li>Tastaturbedienung mit sichtbaren Fokusmarkierungen</li>
            <li>Sprunglink direkt zum Hauptinhalt</li>
            <li>Responsive Darstellung für kleine Bildschirme</li>
            <li>Reduzierte Bewegungen entsprechend der Geräteeinstellung</li>
            <li>Textliche Informationen unabhängig von Farbe und Karte</li>
          </ul>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">02 · Einordnung</p>
          <h2>Selbsteinschätzung, noch kein formales Audit</h2>
        </div>
        <div className="info-prose">
          <p>
            Die Anwendung orientiert sich an WCAG 2.2 auf Konformitätsstufe AA.
            Eine vollständige unabhängige Prüfung hat noch nicht stattgefunden.
            Neue Kartenfunktionen erhalten immer eine gleichwertige Listen- oder
            Textansicht.
          </p>
          <p>
            Wenn etwas nicht erreichbar oder verständlich ist, hilft eine kurze
            Beschreibung des Problems, der betroffenen Seite und des verwendeten
            Geräts.
          </p>
          <Link className="text-link" href="/kontakt">
            Barriere melden
          </Link>
        </div>
      </section>
    </InfoPage>
  );
}
