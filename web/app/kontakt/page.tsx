import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { getLegalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Kontakt und Korrekturen",
  description: "Kontaktwege für Hinweise und Korrekturen zum RötgesPortal.",
};

export default function ContactPage() {
  const { operator } = getLegalConfig();

  return (
    <InfoPage
      eyebrow="Hinweise willkommen"
      intro="Eine fehlende Quelle, ein überholter Stand oder eine schwer verständliche Formulierung? Hinweise helfen, das Portal verlässlicher zu machen."
      title="Gemeinsam genauer werden."
    >
      <section className="contact-grid">
        <article>
          <p className="section-index">Inhalte &amp; Technik</p>
          <h2>Korrektur oder Idee melden</h2>
          <p>
            Bitte nenne die betroffene Seite, die gewünschte Änderung und – wenn
            möglich – eine öffentliche Quelle. Nicht vertrauliche Hinweise
            können als GitHub-Issue öffentlich nachvollziehbar bearbeitet
            werden. Alternativ ist eine direkte Kontaktaufnahme per E-Mail
            möglich.
          </p>
          <div className="info-actions">
            <a href={`mailto:${operator.email}`}>E-Mail schreiben</a>
            <a
              href="https://github.com/codeWithDEI/RoetgesPortal/issues/new"
              rel="noreferrer"
              target="_blank"
            >
              Hinweis auf GitHub öffnen <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
        <article>
          <p className="section-index">Amtliche Anliegen</p>
          <h2>Direkt zur Gemeinde</h2>
          <p>
            RötgesPortal kann keine amtlichen Auskünfte erteilen oder Anträge
            entgegennehmen. Dafür ist die Gemeindeverwaltung der richtige
            Kontakt.
          </p>
          <a className="button-link button-link--secondary" href="https://www.roetgesbuettel.de/" rel="noreferrer" target="_blank">
            Offizielle Gemeindeseite <span aria-hidden="true">↗</span>
          </a>
        </article>
      </section>
      <section className="info-section info-section--notice">
        <p>
          <strong>Sicherheitslücke entdeckt?</strong> Bitte keine technischen
          Details in einem öffentlichen Issue veröffentlichen. Nutze die
          Kontakt-E-Mail oder nach Möglichkeit die private Sicherheitsmeldung
          des GitHub-Repositories.
        </p>
      </section>
    </InfoPage>
  );
}
