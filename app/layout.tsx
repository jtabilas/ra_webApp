import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

// Geist via fallback CSS font stack (no Google Fonts dependency required)
// See globals.css --font-sans

export const metadata: Metadata = {
  title: "RA — Algebra Relazionale",
  description:
    "Interprete didattico di algebra relazionale, in stile Duke RA / radb. Tutto client-side, nessun upload.",
  metadataBase: new URL("https://ra-web.local"),
  openGraph: {
    title: "RA — Algebra Relazionale",
    description: "Interprete didattico, client-side, sintassi radb compatibile.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Pre-paint theme + locale to prevent flash. Keeps the document
            consistent before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ra-web:ui:v1');if(s){var p=JSON.parse(s);if(p.theme==='dark')document.documentElement.classList.add('dark');if(p.locale)document.documentElement.lang=p.locale;}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${jetbrains.variable}`}>
        <div className="atmos-sigma" aria-hidden>σ</div>
        {children}
      </body>
    </html>
  );
}
