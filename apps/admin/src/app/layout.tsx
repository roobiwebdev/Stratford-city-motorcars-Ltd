import type { Metadata, Viewport } from "next";
import { Archivo, Cinzel, Newsreader } from "next/font/google";

import "../index.css";
import { Providers } from "./providers";

/** The website's three families, each in the same role. */
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-cinzel", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-newsreader", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s · Stratford City Motorcars admin",
    default: "Stratford City Motorcars admin",
  },
  applicationName: "Stratford City Motorcars admin",
  // Internal tool: never indexed, followed or previewed.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${cinzel.variable} ${newsreader.variable} ${archivo.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
