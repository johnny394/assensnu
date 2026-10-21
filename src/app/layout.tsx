import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import { LangProvider } from "@/components/useLang";
import { chooseLang } from "@/lib/translate";
import "./globals.css";

// Atkinson Hyperlegible er lavet til at være let at læse for alle, også med dårligt syn
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });
// Fraunces giver overskrifterne et præg af lokalavis. Skrifterne sættes på <html>, så temaets variabler kan finde dem
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "AssensNu · Hvem har åbent i Assens?",
  description: "Alle spisesteder i Assens ét sted. Se hvem der har åbent, find menuen, bestil takeaway og book bord.",
  appleWebApp: { title: "AssensNu", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f3eee2",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await chooseLang();
  return (
    <html lang={lang} className={`${atkinson.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <LangProvider lang={lang} texts={{}}>
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
