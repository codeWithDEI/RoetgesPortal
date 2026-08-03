import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type InfoPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function InfoPage({ eyebrow, title, intro, children }: InfoPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="info-page" id="main-content">
        <header className="info-hero">
          <div className="info-hero__inner">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>
        </header>
        <div className="info-layout">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
