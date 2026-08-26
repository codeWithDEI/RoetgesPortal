import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong>RötgesPortal</strong>
          <p>Kommunale Themen verständlich und nachvollziehbar aufbereitet.</p>
        </div>
        <nav className="footer-nav" aria-label="Weitere Informationen">
          <Link href="/projekt">Projekt</Link>
          <Link href="/neu">Neu &amp; aktualisiert</Link>
          <a href="/feed.xml" type="application/rss+xml">
            RSS-Feed
          </a>
          <Link href="/barrierefreiheit">Barrierefreiheit</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <Link href="/impressum">Impressum</Link>
          <Link href="/kontakt">Kontakt &amp; Korrekturen</Link>
        </nav>
        <div className="site-footer__notice">
          <strong>Unabhängiges Informationsangebot</strong>
          <p>
            RötgesPortal ist derzeit keine offizielle Seite der Gemeinde
            Rötgesbüttel. Für amtliche Informationen gilt die Website der
            Gemeinde.
          </p>
          <a href="https://www.roetgesbuettel.de/" rel="noreferrer" target="_blank">
            Zur offiziellen Gemeindeseite <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
