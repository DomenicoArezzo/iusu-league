import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "@/lib/app";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: { default: "IUSU LEAGUE", template: "%s · IUSU LEAGUE" },
  description: "La lega del calcetto di Iusu: partite, risultati, classifiche, squadre e premi.",
};

export const viewport: Viewport = { themeColor: "#070707", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Applica la dimensione del testo scelta prima del primo disegno, per evitare lo "scatto" al caricamento.
const textSizeScript = `try{var s=localStorage.getItem("iusu-text-size");if(s==="lg"||s==="xl")document.documentElement.dataset.textSize=s}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: textSizeScript }} />
      </head>
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
