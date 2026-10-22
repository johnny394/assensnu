// Regneark til et dashboard. Uden navne, telefonnumre og adresser.
const FILES = [
  { fil: "ordrer", label: "Bestillinger", text: "Én linje pr. bestilling: sted, dag, tid, beløb, afhentning eller levering." },
  { fil: "retter", label: "Retter", text: "Én linje pr. ret: hvad der bliver købt, hvor meget og hvor." },
  { fil: "steder", label: "Spisesteder", text: "Alle steder: med eller ej, bestilling, booking, levering." },
  { fil: "borde", label: "Bordbookinger", text: "Én linje pr. bord: sted, dag, antal gæster, svar." },
];

export function AdminExport() {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight">Data til dashboard</h2>
      <p className="text-lg text-ink-soft">Hent tallene som regneark og åbn dem i Excel, Google Sheets eller Power BI. Alt fra start. Der står ingen navne, telefonnumre eller adresser i.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FILES.map((f) => (
          <a key={f.fil} href={`/api/admin/export?fil=${f.fil}`} className="block rounded-2xl border-2 border-ink px-5 py-4">
            <span className="block text-xl font-bold">Hent {f.label.toLowerCase()}</span>
            <span className="block text-base text-ink-soft">{f.text}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
