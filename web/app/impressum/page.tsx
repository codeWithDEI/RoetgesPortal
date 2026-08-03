import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Betreiber- und Rechtshinweise zum RötgesPortal-Prototyp.",
};

export default function LegalNoticePage() {
  return (
    <InfoPage
      eyebrow="Rechtliche Hinweise"
      intro="RötgesPortal befindet sich als unabhängiger, nichtkommerzieller Prototyp im Aufbau und ist keine offizielle Veröffentlichung der Gemeinde."
      title="Verantwortung klar benennen."
    >
      <section className="info-section info-section--split">
        <div>
          <p className="section-index">01 · Projektbetrieb</p>
          <h2>Anbieterkennzeichnung im Aufbau</h2>
        </div>
        <div className="info-prose">
          <p>
            Projekt und Inhalte werden derzeit durch den Inhaber des
            GitHub-Kontos <strong>codeWithDEI</strong> bereitgestellt. Die
            vollständige Anbieterkennzeichnung einschließlich einer
            ladungsfähigen Anschrift wird vor dem dauerhaften Produktivbetrieb
            unter eigener Domain ergänzt.
          </p>
          <p>
            Für Korrekturen und Projektanfragen steht bis dahin der öffentliche
            Kontaktweg des Repositories zur Verfügung. Sicherheitsprobleme
            sollen nicht öffentlich gemeldet werden.
          </p>
          <Link className="text-link" href="/kontakt">
            Kontaktmöglichkeiten
          </Link>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">02 · Abgrenzung</p>
          <h2>Amtliche Informationen</h2>
        </div>
        <div className="info-prose">
          <p>
            Maßgeblich sind ausschließlich die Veröffentlichungen der jeweils
            zuständigen öffentlichen Stelle. Externe Quellen werden sorgfältig
            verlinkt; für deren Inhalte und dauerhafte Erreichbarkeit ist
            RötgesPortal nicht verantwortlich.
          </p>
          <a className="text-link" href="https://www.roetgesbuettel.de/Service/Impressum/" rel="noreferrer" target="_blank">
            Offizielles Impressum der Gemeinde <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </InfoPage>
  );
}
