import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible er lavet til at være let at læse for alle, også med dårligt syn
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], weight: ["600", "800"] });

export const metadata: Metadata = {
  title: "AssensNu · Hvem har åbent i Assens?",
  description: "Alle spisesteder i Assens ét sted. Se hvem der har åbent, find menuen, bestil takeaway og book bord.",
  appleWebApp: { title: "AssensNu", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#eef3f2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body className={`${atkinson.variable} ${schibsted.variable} antialiased`}>{children}</body>
    </html>
  );
}
