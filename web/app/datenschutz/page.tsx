import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzhinweise für RötgesPortal.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Datensparsam gestaltet"
      intro="RötgesPortal benötigt für die öffentliche Themenansicht weder Benutzerkonto noch Datenbank. Seitenaufrufe werden ausschließlich serverseitig und ohne dauerhafte Besucherkennung gezählt."
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
            IP-Adresse, Zeitpunkt und angeforderte Adresse an den Server. Für
            die Zugriffsstatistik wird die IP-Adresse vor dem Speichern
            verworfen. Browserkennung, Referrer, Anfrage-Header, entfernte
            Ports und Werte aus URL-Abfragen werden nicht protokolliert.
          </p>
          <p>
            Gespeichert werden Zeitpunkt, aufgerufener Pfad, Anfragemethode,
            Antwortstatus, übertragene Datenmenge und Bearbeitungsdauer.
            Technische Dateien, Kartendaten und automatische
            Verfügbarkeitsprüfungen werden nicht mitgezählt. Die reduzierten
            Zugriffsprotokolle werden nach spätestens sieben Tagen gelöscht und
            nur zu einer internen Statistik über Seitenaufrufe und Fehler
            zusammengefasst.
          </p>
          <p>
            Die Anwendung setzt keine Analyse-, Werbe- oder Profiling-Cookies
            und bindet keinen externen Analysedienst ein. Die Statistik erlaubt
            keine verlässliche Bestimmung einzelner oder wiederkehrender
            Besucher. Es gibt keine Registrierung, Kommentarfunktion oder
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
            Datenschutzhinweise. Logo und weitere Gestaltungselemente werden
            lokal ausgeliefert und erzeugen deshalb keine zusätzlichen Abrufe
            bei externen Anbietern.
          </p>
        </div>
      </section>

      <section className="info-section info-section--notice">
        <p>
          <strong>Stand: 14. August 2026.</strong> Diese Seite beschreibt den
          aktuellen öffentlichen Prototyp. Vor einem dauerhaften Betrieb unter
          eigener Domain werden verantwortliche Stelle, Hostinganbieter,
          Rechtsgrundlagen, Speicherdauern und Betroffenenrechte mit den
          endgültigen Betreiberangaben vervollständigt.
        </p>
      </section>
    </InfoPage>
  );
}
