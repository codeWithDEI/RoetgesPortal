import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzhinweise für die öffentliche Vorschau von RötgesPortal.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Datensparsam gestaltet"
      intro="RötgesPortal benötigt für die öffentliche Themenansicht weder Benutzerkonto noch Datenbank und setzt derzeit keine eigene Reichweitenanalyse ein."
      title="So wenig personenbezogene Daten wie möglich."
    >
      <section className="info-section info-section--split">
        <div>
          <p className="section-index">01 · Portalnutzung</p>
          <h2>Welche Daten verarbeitet werden können</h2>
        </div>
        <div className="info-prose">
          <p>
            Beim Aufruf überträgt der Browser technisch notwendige Angaben wie
            IP-Adresse, Zeitpunkt, angeforderte Adresse, Browserkennung und
            Referrer an den Hostingdienst. Diese Daten können in technischen
            Protokollen verarbeitet werden, um die Website auszuliefern, Fehler
            zu erkennen und Angriffe abzuwehren.
          </p>
          <p>
            Die Anwendung setzt derzeit keine eigenen Analyse-, Werbe- oder
            Profiling-Cookies und speichert keine persönlichen Einstellungen im
            Browser. Es gibt keine Registrierung, Kommentarfunktion oder
            Newsletter-Anmeldung.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">02 · Externe Ziele</p>
          <h2>Quellen und GitHub</h2>
        </div>
        <div className="info-prose">
          <p>
            Links zu Originalquellen, zur Gemeindeseite und zu GitHub öffnen
            externe Angebote. Ab dem Aufruf gelten deren eigene
            Datenschutzhinweise. Das Gemeindewappen wird lokal ausgeliefert und
            erzeugt deshalb keinen zusätzlichen Abruf bei der Gemeinde.
          </p>
        </div>
      </section>

      <section className="info-section info-section--notice">
        <p>
          <strong>Stand: 3. August 2026.</strong> Diese Seite beschreibt den
          aktuellen öffentlichen Prototyp. Vor einem dauerhaften Betrieb unter
          eigener Domain werden verantwortliche Stelle, Hostinganbieter,
          Rechtsgrundlagen, Speicherdauern und Betroffenenrechte mit den
          endgültigen Betreiberangaben vervollständigt.
        </p>
      </section>
    </InfoPage>
  );
}
