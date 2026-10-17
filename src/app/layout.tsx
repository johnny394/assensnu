import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AssensNu · Mad, takeaway og bordbooking i Assens",
  description: "Alle spisesteder i Assens samlet ét sted. Se hvem der har åbent, find menuen, bestil takeaway og book bord.",
  appleWebApp: { title: "AssensNu", capable: true },
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className={`${geistSans.variable} antialiased`}>
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">
              Assens<span className="text-orange-600">Nu</span>
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
