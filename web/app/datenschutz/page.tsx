import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { getLegalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzhinweise für RötgesPortal.",
};

export default function PrivacyPage() {
  const { email, hosting, operator } = getLegalConfig();

  return (
    <InfoPage
      eyebrow="Datensparsam gestaltet"
      intro="RötgesPortal benötigt weder Benutzerkonto noch Datenbank und verzichtet auf Tracking. Diese Hinweise erklären die dennoch technisch notwendigen Verarbeitungen."
      title="So wenig personenbezogene Daten wie möglich."
    >
      <section className="info-section info-section--split">
        <div>
          <p className="section-index">01 · Verantwortlicher</p>
          <h2>Wer für die Verarbeitung verantwortlich ist</h2>
        </div>
        <div className="info-prose">
          <address className="legal-address">
            <strong>{operator.name}</strong>
            <br />
            {operator.street}
            <br />
            {operator.postalCode} {operator.city}
            <br />
            {operator.country}
          </address>
          <p>
            E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">02 · Websitebetrieb</p>
          <h2>Bereitstellung der Website und reduzierte Server-Logs</h2>
        </div>
        <div className="info-prose">
          <p>
            Beim Aufruf der Website muss die IP-Adresse technisch verarbeitet
            werden, damit der Server die angeforderten Inhalte an den Browser
            ausliefern kann. RötgesPortal schreibt daraus nur ein bewusst
            reduziertes Access-Log: Caddy ersetzt Client-IP-Adressen vor dem
            Schreiben durch <code>0.0.0.0</code>, entfernt den Remote-Port und
            speichert keine Request-Header. Querystrings werden vor dem
            Speichern redigiert.
          </p>
          <p>
            Im reduzierten Log verbleiben Zeitpunkt, angeforderter Pfad,
            Methode, Antwortstatus, übertragene Datenmenge und
            Bearbeitungsdauer. Nicht-GET-Anfragen sowie die in der
            Caddy-Konfiguration ausgenommenen API-, Daten-, Bild- und
            Asset-Aufrufe werden nicht für die Seitenabrufstatistik
            protokolliert. Die aktive Logdatei rotiert täglich; einschließlich
            der aufbewahrten Tagesdateien werden Einträge nach spätestens
            sieben Tagen gelöscht.
          </p>
          <p>
            GoAccess erstellt daraus ausschließlich eine private,
            serverseitige Übersicht über Seitenabrufe und Fehlerstatus. Die
            Auswertung soll weder einzelne noch wiederkehrende Besucher
            ermitteln. Das Dashboard ist nur an die Loopback-Adresse des
            Servers gebunden und nicht öffentlich erreichbar.
          </p>
          <p>
            Rechtsgrundlage für den technisch notwendigen Websitebetrieb, die
            Sicherheit, Fehleranalyse und diese datensparsame Betriebsstatistik
            ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im
            sicheren, stabilen und nachvollziehbaren Betrieb des
            Informationsangebots.
          </p>
          <p>
            Die Nutzung des Informationsangebots ist freiwillig. Ohne die
            technisch notwendige Verarbeitung der IP-Adresse kann die Website
            jedoch nicht an den Browser ausgeliefert werden.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">03 · Hosting und Empfänger</p>
          <h2>Technischer Betrieb durch den Hostinganbieter</h2>
        </div>
        <div className="info-prose">
          <p>
            Als Hostinganbieter und Empfänger der für den Serverbetrieb
            erforderlichen Daten wird <strong>{hosting.providerName}</strong>
            eingesetzt. Vertraglich vorgesehene Verarbeitungsorte: {" "}
            <strong>{hosting.processingLocations}</strong>. Der Anbieter kann
            die technisch erforderlichen Verbindungsdaten verarbeiten, bevor
            RötgesPortal das oben beschriebene reduzierte Access-Log schreibt.
            Soweit der Anbieter Daten im Auftrag verarbeitet, erfolgt dies auf
            Grundlage eines Vertrags nach Art. 28 DSGVO.
          </p>
          <p>{hosting.retentionInformation}</p>
          <p>{hosting.thirdCountryInformation}</p>
          <p>
            Weitere Empfänger erhalten personenbezogene Daten nur, wenn dies
            gesetzlich vorgeschrieben oder zur Geltendmachung, Ausübung oder
            Verteidigung von Rechtsansprüchen erforderlich ist.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">04 · OpenStreetMap</p>
          <h2>Interaktive Karte</h2>
        </div>
        <div className="info-prose">
          <p>
            Beim Öffnen der Kartenseite lädt der Browser Raster-Kacheln direkt
            von <code>tile.openstreetmap.org</code>. Dadurch entsteht eine
            direkte Verbindung zu der von der OpenStreetMap Foundation (OSMF)
            betriebenen Tile-Infrastruktur. Dabei werden insbesondere die
            technisch notwendige IP-Adresse und übliche Request-Metadaten wie
            Browser- und Geräteangaben, Referrer, Zeitpunkt und angeforderte
            Kacheln übertragen.
          </p>
          <p>
            Die OSMF mit Sitz im Vereinigten Königreich verarbeitet diese
            Daten als eigenständig Verantwortliche. Für das Vereinigte
            Königreich besteht ein Angemessenheitsbeschluss der Europäischen
            Kommission nach Art. 45 DSGVO. Nach Angaben der OSMF werden
            Kartenkacheln über ein globales Content Delivery Network
            ausgeliefert; der konkrete Cache-Standort wird bei der Anfrage
            dynamisch bestimmt und kann auch in einem anderen Land liegen.
          </p>
          <p>
            Rechtsgrundlage für die durch RötgesPortal veranlasste Verbindung
            ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse besteht
            darin, den vom Nutzer aufgerufenen Ortsbezug kommunaler Themen
            verständlich in einer interaktiven Karte darzustellen. Der Abruf
            erfolgt nur auf der Kartenseite; die Themenliste bleibt auch ohne
            die Karte verfügbar.
          </p>
          <div className="info-actions">
            <a
              href="https://osmfoundation.org/wiki/Privacy_Policy"
              rel="noreferrer"
              target="_blank"
            >
              Datenschutzinformationen der OSMF {" "}
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href="https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en"
              rel="noreferrer"
              target="_blank"
            >
              Angemessenheitsbeschlüsse der EU {" "}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">05 · Cookies und lokale Speicherung</p>
          <h2>Kein Tracking im Browser</h2>
        </div>
        <div className="info-prose">
          <p>
            RötgesPortal setzt keine Cookies ein und nutzt weder {" "}
            <code>localStorage</code> noch <code>sessionStorage</code>. Damit
            gibt es insbesondere keine Analyse- oder Werbecookies. Es findet
            kein Profiling statt, und es ist kein externer Analytics-Dienst
            eingebunden. Es gibt keine Nutzerkonten, keine
            Newsletter-Anmeldung und keine Social-Media-Embeds. Schriftarten,
            Logo und weitere Gestaltungselemente werden lokal von
            RötgesPortal ausgeliefert.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">06 · E-Mail</p>
          <h2>Kontaktaufnahme per E-Mail</h2>
        </div>
        <div className="info-prose">
          <p>
            Bei einer Kontaktaufnahme per E-Mail werden Absenderadresse,
            Nachrichteninhalt und die technisch üblichen Mail-Metadaten
            verarbeitet. Zweck ist die Bearbeitung und Beantwortung der
            Anfrage. Dabei sind die an der Übermittlung beteiligten
            Mailanbieter Empfänger der Kommunikationsdaten.
          </p>
          <p>
            Für das Kontaktpostfach wird <strong>{email.providerName}</strong>
            eingesetzt. Vertraglich vorgesehene Verarbeitungsorte: {" "}
            <strong>{email.processingLocations}</strong>. {" "}
            {email.thirdCountryInformation}
          </p>
          <p>
            Für gewöhnliche Projekt-, Hinweis- und Korrekturanfragen ist die
            Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO; das berechtigte
            Interesse liegt in der verlässlichen Bearbeitung solcher Anfragen.
            Soweit eine Anfrage auf ein Vertragsverhältnis gerichtet ist, kann
            zusätzlich Art. 6 Abs. 1 lit. b DSGVO einschlägig sein.
          </p>
          <p>
            Die Daten werden gelöscht, sobald sie für die Bearbeitung nicht
            mehr erforderlich sind, sofern keine gesetzlichen
            Aufbewahrungspflichten oder die Erforderlichkeit zur
            Rechtsverteidigung entgegenstehen. Die Kontaktaufnahme ist
            freiwillig. Ohne die für eine Antwort notwendigen Angaben kann die
            Anfrage gegebenenfalls nicht beantwortet werden.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">07 · Externe Links</p>
          <h2>Quellen, Gemeinde und GitHub</h2>
        </div>
        <div className="info-prose">
          <p>
            Verweise auf Originalquellen, die Gemeinde, GitHub und weitere
            externe Informationsseiten sind normale Links und keine
            eingebetteten Inhalte. Eine Verbindung zum jeweiligen externen
            Anbieter entsteht durch RötgesPortal erst, wenn der Nutzer den Link
            aufruft. Ab dann gelten die Datenschutzinformationen des externen
            Anbieters.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">08 · Rechte</p>
          <h2>Rechte betroffener Personen</h2>
        </div>
        <div className="info-prose">
          <p>
            Soweit die jeweiligen gesetzlichen Voraussetzungen erfüllt sind,
            bestehen Rechte auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung und Datenübertragbarkeit. Gegen eine
            Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO kann aus
            Gründen, die sich aus der besonderen Situation der betroffenen
            Person ergeben, Widerspruch eingelegt werden.
          </p>
          <p>
            Außerdem besteht das Recht, sich bei einer
            Datenschutzaufsichtsbehörde zu beschweren. Die naheliegende
            Aufsichtsbehörde ist:
          </p>
          <address className="legal-address">
            <a
              href="https://www.lfd.niedersachsen.de/"
              rel="noreferrer"
              target="_blank"
            >
              Der Landesbeauftragte für den Datenschutz Niedersachsen
            </a>
            <br />
            Prinzenstraße 5
            <br />
            30159 Hannover
          </address>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">09 · Automatisierte Entscheidungen</p>
          <h2>Keine automatisierte Bewertung</h2>
        </div>
        <div className="info-prose">
          <p>
            Es findet keine automatisierte Entscheidungsfindung und kein
            Profiling im Sinne von Art. 22 DSGVO statt.
          </p>
        </div>
      </section>

      <section className="info-section info-section--notice">
        <p>
          <strong>Stand: 18. August 2026.</strong> Die Hinweise entsprechen dem
          zu diesem Zeitpunkt geprüften technischen Stand des Portals.
        </p>
      </section>
    </InfoPage>
  );
}
