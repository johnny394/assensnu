import { clockTime, todaysDish } from "@/lib/live";
import { translator, type T } from "@/lib/i18n";
import type { Place } from "@/lib/types";
import { TodaysDishButton } from "./TodaysDishButton";

// Tilbudspris som i en tilbudsavis: "99,-"
export const offerPrice = (kr: number) => `${kr.toLocaleString("da-DK")},-`;

// Dagens tilbud på stedets side: gult som en tilbudsavis, med et rødt TILBUD-mærke og stor pris
export function TodaysOffer({ place, t = translator("da") }: { place: Place; t?: T }) {
  const news = place.news;
  if (!news) return null;
  const dish = todaysDish(news);
  return (
    <section id="dagens-tilbud" className="relative mt-6 scroll-mt-24 border-[3px] border-ink bg-buoy px-4 pb-4 pt-3 shadow-[6px_6px_0_var(--color-ink)]">
      <span
        aria-hidden
        className="absolute -right-3 -top-5 grid h-[4.5rem] w-[4.5rem] rotate-12 place-items-center rounded-full bg-stamp text-center text-sm font-black uppercase leading-none tracking-[0.08em] text-paper shadow-md"
      >
        {t("Tilbud")}
      </span>
      <p className="pr-14 text-sm font-bold uppercase tracking-[0.15em]">{t("Dagens tilbud · kl. {tid}", { tid: clockTime(news.sentAt) })}</p>
      <p className="mt-1 pr-10 font-display text-2xl font-black leading-tight">{t(news.text)}</p>
      {news.price && (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <span className="font-display text-5xl font-black tabular-nums text-stamp">{offerPrice(news.price)}</span>
          {news.wasPrice && (
            <span className="text-lg">
              <span className="line-through">{t("før {pris}", { pris: offerPrice(news.wasPrice) })}</span> <strong>{t("Spar {kr} kr.", { kr: news.wasPrice - news.price })}</strong>
            </span>
          )}
        </p>
      )}
      {dish && place.acceptsOrders && <TodaysDishButton slug={place.slug} dish={dish} />}
    </section>
  );
}
