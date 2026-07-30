import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/themen" aria-label="RötgesPortal Startseite">
          <span className="brand__mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand__name">RötgesPortal</span>
        </Link>
        <nav className="primary-nav" aria-label="Hauptnavigation">
          <Link aria-current="page" href="/themen">
            Themen
          </Link>
          <span className="primary-nav__future" aria-disabled="true">
            Karte
            <small>später</small>
          </span>
        </nav>
      </div>
    </header>
  );
}
