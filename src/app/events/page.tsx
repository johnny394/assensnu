import { AppShell } from "@/components/AppShell";

export default function EventsPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-8">
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">Hvad sker der i Assens?</h1>
        <div className="mt-6 rounded-3xl bg-surface px-5 py-6 text-lg">
          <p>Koncerter, markeder, festivaler og alt det andet, der sker i byen, kommer her snart.</p>
          <p className="mt-3 text-ink-soft">Indtil da kan du finde noget godt at spise under Mad.</p>
        </div>
      </main>
    </AppShell>
  );
}
