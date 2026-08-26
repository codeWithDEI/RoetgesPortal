import type { Metadata } from "next";
import { Geist } from "next/font/google";
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
} from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [{ url: "/roetgesportal-mark.svg", type: "image/svg+xml" }],
    shortcut: "/roetgesportal-mark.svg",
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "RötgesPortal",
    title: "RötgesPortal · Was bewegt unseren Ort?",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/og.png"),
        width: 1731,
        height: 909,
        alt: "RötgesPortal – Was bewegt unseren Ort?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RötgesPortal · Was bewegt unseren Ort?",
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/og.png")],
  },
};

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
