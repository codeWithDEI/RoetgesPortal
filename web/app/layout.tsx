import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description =
    "Kommunale Themen aus Rötgesbüttel verständlich, transparent und mit Quellen aufbereitet.";
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: {
      default: "RötgesPortal",
      template: "%s · RötgesPortal",
    },
    description,
    icons: {
      icon: [{ url: "/roetgesportal-mark.svg", type: "image/svg+xml" }],
      shortcut: "/roetgesportal-mark.svg",
    },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: "RötgesPortal",
      title: "RötgesPortal · Was bewegt unseren Ort?",
      description,
      images: [
        {
          url: socialImage,
          width: 1731,
          height: 909,
          alt: "RötgesPortal – Was bewegt unseren Ort?",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "RötgesPortal · Was bewegt unseren Ort?",
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={geistSans.variable}>{children}</body>
    </html>
  );
}
