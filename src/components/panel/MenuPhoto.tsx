"use client";

import { useRef, useState } from "react";
import { MAX_PHOTOS, MAX_UPLOAD_CHARS, type ReadAnswer } from "@/lib/menu-photo";

// "Tag billede af menukortet": restauranten fotograferer kortet (en side ad gangen), og AI'en
// skriver retterne ind i menukort-skærmen. Har de et menukort i forvejen, spørger vi, hvad der skal ske med det.

type Photo = { type: string; data: string; preview: string };
type Step = { at: "idle" } | { at: "reading" } | { at: "ask"; answer: ReadAnswer } | { at: "error"; message: string };

const LONGEST_SIDE = 1600;

// Billeder fra telefonen er store. De gøres mindre her, så de kan sendes hurtigt og stadig læses.
async function shrink(file: File): Promise<Photo> {
  if (file.type === "application/pdf") {
    if (file.size > 3_000_000) throw new Error("PDF'en er for stor. Tag hellere et billede af hver side.");
    const data = await new Promise<string>((ok, fail) => {
      const reader = new FileReader();
      reader.onload = () => ok(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => fail(new Error("PDF'en kunne ikke åbnes."));
      reader.readAsDataURL(file);
    });
    return { type: file.type, data, preview: "" };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("Billedet kunne ikke åbnes. Prøv at tage det igen med kameraet."));
      i.src = url;
    });
    const scale = Math.min(1, LONGEST_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return { type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const dishCount = (a: ReadAnswer) => a.categories.reduce((n, c) => n + c.items.length, 0);

export function MenuPhoto({ hasMenu, onRead }: { hasMenu: boolean; onRead: (answer: ReadAnswer, how: "replace" | "add") => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [step, setStep] = useState<Step>({ at: "idle" });

  async function choose(files: FileList | null) {
    if (!files?.length) return;
    try {
      const added = await Promise.all([...files].slice(0, MAX_PHOTOS - photos.length).map(shrink));
      setPhotos((p) => [...p, ...added]);
      setStep({ at: "idle" });
    } catch (e) {
      setStep({ at: "error", message: e instanceof Error ? e.message : "Billedet kunne ikke åbnes." });
    }
    if (input.current) input.current.value = "";
  }

  async function read() {
    if (photos.reduce((n, p) => n + p.data.length, 0) > MAX_UPLOAD_CHARS) {
      setStep({ at: "error", message: "Billederne fylder for meget tilsammen. Fjern et af dem, og prøv igen." });
      return;
    }
    setStep({ at: "reading" });
    const res = await fetch("/api/panel/menu-foto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: photos.map(({ type, data }) => ({ type, data })) }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok || !body?.categories) {
      setStep({ at: "error", message: body?.error ?? "Ingen forbindelse. Prøv igen." });
      return;
    }
    if (hasMenu) setStep({ at: "ask", answer: body });
    else apply(body, "replace");
  }

  function apply(answer: ReadAnswer, how: "replace" | "add") {
    onRead(answer, how);
    setPhotos([]);
    setStep({ at: "idle" });
  }

  const picker = (
    <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => choose(e.target.files)} />
  );

  if (step.at === "reading") {
    return (
      <div className="mb-6 rounded-3xl bg-buoy-soft p-5" role="status">
        <p className="font-display text-xl font-black">Vi læser jeres menukort …</p>
        <p className="mt-1 text-lg">Det kan tage et minut eller to. Lad siden være åben imens.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
          <div className="h-full w-1/3 animate-[menu-read_1.6s_ease-in-out_infinite] rounded-full bg-buoy-deep" />
        </div>
        <style>{`@keyframes menu-read{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
      </div>
    );
  }

  if (step.at === "ask") {
    const n = dishCount(step.answer);
    return (
      <div className="mb-6 rounded-3xl bg-buoy-soft p-5">
        <p className="font-display text-xl font-black">Vi fandt {n} {n === 1 ? "ret" : "retter"} på billedet</p>
        <p className="mt-1 text-lg">I har allerede et menukort her. Hvad skal vi gøre med det?</p>
        <button onClick={() => apply(step.answer, "replace")} className="mt-4 min-h-14 w-full rounded-2xl bg-buoy px-4 text-lg font-bold">
          Brug det nye menukort i stedet
        </button>
        <button onClick={() => apply(step.answer, "add")} className="mt-2 min-h-14 w-full rounded-2xl border-2 border-ink px-4 text-lg font-bold">
          Læg de nye retter til det, der står
        </button>
        <button onClick={() => setStep({ at: "idle" })} className="mt-2 w-full py-2 text-lg underline">Fortryd</button>
        <p className="mt-2 text-ink-soft">Uanset hvad, bliver intet gemt, før I har set det igennem og trykket Gem.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-3xl bg-buoy-soft p-5">
      {picker}
      {photos.length === 0 ? (
        <>
          <p className="font-display text-xl font-black">Har I menukortet på papir?</p>
          <p className="mt-1 text-lg">Tag et billede af det, så skriver vi retterne ind for jer. I kan rette det hele, før noget bliver gemt.</p>
          <button onClick={() => input.current?.click()} className="mt-4 min-h-14 w-full rounded-2xl bg-buoy px-4 text-lg font-bold">
            Tag billede af menukortet
          </button>
        </>
      ) : (
        <>
          <p className="font-display text-xl font-black">{photos.length === 1 ? "1 billede" : `${photos.length} billeder`} klar</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <li key={i} className="relative">
                {p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt={`Side ${i + 1}`} className="h-24 w-20 rounded-xl border-2 border-line object-cover" />
                ) : (
                  <span className="grid h-24 w-20 place-items-center rounded-xl border-2 border-line bg-surface font-bold">PDF</span>
                )}
                <button
                  onClick={() => setPhotos((all) => all.filter((_, j) => j !== i))}
                  aria-label={`Fjern side ${i + 1}`}
                  className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-ink text-lg text-paper"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {photos.length < MAX_PHOTOS && (
            <>
              <p className="mt-3 text-lg">Har menukortet flere sider? Tag et billede af hver side.</p>
              <button onClick={() => input.current?.click()} className="mt-1 py-1 text-lg font-bold underline">+ Tag billede af næste side</button>
            </>
          )}
          <button onClick={read} className="mt-4 min-h-14 w-full rounded-2xl bg-buoy px-4 text-lg font-bold">
            Læs menukortet
          </button>
          <button onClick={() => { setPhotos([]); setStep({ at: "idle" }); }} className="mt-2 w-full py-2 text-lg underline">Fortryd</button>
        </>
      )}
      {step.at === "error" && <p role="alert" className="mt-3 rounded-2xl bg-signal-soft px-4 py-3 text-lg text-signal">{step.message}</p>}
      <p className="mt-3 text-ink-soft">Tip: Læg kortet fladt i godt lys, og tag billedet lige ovenfra.</p>
    </div>
  );
}
