import Link from "next/link";
import type { AssensEvent } from "@/lib/events";
import type { T } from "@/lib/i18n";

// Et event som en lille avisnotits: tid, titel, sted, et par linjer
export function EventCard({ event, t, eatLink = true }: { event: AssensEvent; t: T; eatLink?: boolean }) {
  return (
    <article className="border-b border-line py-5 last:border-b-0">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-stamp">
        {t("Kl. {tid}", { tid: event.time })} · {event.venue}
      </p>
      <h3 className="mt-1 font-display text-[1.7rem] font-black leading-tight tracking-tight">{t(event.title)}</h3>
      {event.text && <p className="mt-1 whitespace-pre-line text-lg text-ink-soft">{t(event.text)}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {eatLink && (
          <Link href={`/events/${event.id}`} className="border-2 border-ink bg-ink px-4 py-2.5 text-lg font-bold text-paper">
            {t("Spis før ›")}
          </Link>
        )}
        {event.link && (
          <a href={event.link} target="_blank" rel="noopener" className="border-2 border-ink px-4 py-2.5 text-lg font-bold">
            {t("Billetter")}
          </a>
        )}
      </div>
    </article>
  );
}
