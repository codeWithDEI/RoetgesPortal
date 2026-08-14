import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Zum Inhalt springen
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" href="/" aria-label="RötgesPortal Startseite">
            <Image
              alt=""
              className="brand__logo"
              height="54"
              priority
              src="/roetgesportal-mark.svg"
              unoptimized
              width="54"
            />
            <span className="brand__copy">
              <span className="brand__name">RötgesPortal</span>
              <span className="brand__claim">Unabhängig informiert</span>
            </span>
          </Link>
          <nav className="primary-nav" aria-label="Hauptnavigation">
            <Link href="/themen">Themen</Link>
            <Link href="/karte">Karte</Link>
            <Link href="/projekt">Projekt</Link>
          </nav>
        </div>
      </header>
    </>
  );
}
