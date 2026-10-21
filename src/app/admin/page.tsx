import type { Metadata } from "next";
import { LangProvider } from "@/components/useLang";
import { Wordmark } from "@/components/AppShell";
import { AdminLogin, AdminPanel } from "@/components/admin/AdminPanel";
import { adminCode, isAdmin } from "@/lib/admin-auth";
import { todayInCopenhagen } from "@/lib/hours";
import { isDemo, store } from "@/lib/store";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Dit panel · ${SITE}`, robots: { index: false } };

async function AdminPage() {
  if (await isAdmin()) return <AdminPanel places={await store.adminListPlaces()} events={await store.listEvents(todayInCopenhagen())} />;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Wordmark />
      <h1 className="mt-8 font-display text-[2.3rem] font-extrabold leading-tight tracking-tight">Dit panel</h1>
      <p className="mb-8 text-lg text-ink-soft">Her opretter du spisesteder og giver dem en kode til restaurantpanelet.</p>
      {adminCode() ? (
        <AdminLogin />
      ) : (
        <p className="rounded-2xl bg-buoy-soft px-4 py-3 text-lg">Der er ingen kode endnu. Tilføj ADMIN_KODE med mindst 8 tegn på Vercel under Settings og Environment Variables, og tryk Redeploy.</p>
      )}
      {isDemo && <p className="mt-8 text-center text-ink-soft">Afprøvning: koden er 1234.</p>}
    </main>
  );
}

// Panelerne er altid på dansk, uanset telefonens sprog
export default async function DanishPage() {
  return <LangProvider lang="da" texts={{}}>{await AdminPage()}</LangProvider>;
}
