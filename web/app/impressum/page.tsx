import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { getLegalConfig } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieter- und Verantwortlichkeitsangaben für RötgesPortal.",
};

export default function LegalNoticePage() {
  const { operator } = getLegalConfig();

  return (
    <InfoPage
      eyebrow="Rechtliche Hinweise"
      intro="RötgesPortal ist ein privat und unabhängig betriebenes Informationsangebot. Die verantwortliche Person und die amtlichen Quellen bleiben klar unterscheidbar."
      title="Verantwortung klar benennen."
    >
      <section className="info-section info-section--split">
        <div>
          <p className="section-index">01 · Anbieter</p>
          <h2>Anbieterkennzeichnung</h2>
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
            Die Angaben erfolgen nach § 18 Abs. 1 Medienstaatsvertrag (MStV).
            Soweit § 5 Digitale-Dienste-Gesetz (DDG) auf das Angebot anwendbar
            ist, dienen sie zugleich der dort vorgesehenen Information.
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">02 · Kontakt</p>
          <h2>Direkter Kontakt</h2>
        </div>
        <div className="info-prose">
          <p>
            E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
          </p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">03 · Redaktionelle Verantwortung</p>
          <h2>Verantwortlich für journalistisch-redaktionelle Inhalte</h2>
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
          <p>Verantwortlich gemäß § 18 Abs. 2 MStV.</p>
        </div>
      </section>

      <section className="info-section info-section--split">
        <div>
          <p className="section-index">04 · Abgrenzung</p>
          <h2>Keine amtliche Veröffentlichung</h2>
        </div>
        <div className="info-prose">
          <p>
            RötgesPortal ist keine offizielle Veröffentlichung der Gemeinde
            Rötgesbüttel. Amtliche Informationen, Bekanntmachungen und
            rechtsverbindliche Veröffentlichungen stammen ausschließlich von
            den jeweils zuständigen öffentlichen Stellen.
          </p>
          <a
            className="text-link"
            href="https://www.roetgesbuettel.de/"
            rel="noreferrer"
            target="_blank"
          >
            Offizielle Website der Gemeinde <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </InfoPage>
  );
}
