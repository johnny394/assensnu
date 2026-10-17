import { AppShell } from "@/components/AppShell";

export default function EventsPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8">
        <h1 className="font-display text-[2.9rem] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-[4rem]">Hvad sker der i Assens?</h1>
        <div className="mt-6 rounded-[1.4rem] bg-surface shadow-card px-5 py-6 text-lg">
          <p>Koncerter, markeder, festivaler og alt det andet, der sker i byen, kommer her snart.</p>
          <p className="mt-3 text-ink-soft">Indtil da kan du finde noget godt at spise under Mad.</p>
        </div>
      </main>
    </AppShell>
  );
}
