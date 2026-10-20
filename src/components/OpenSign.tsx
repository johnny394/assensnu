"use client";

import { copenhagenNow, describeStatus, openStatus } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { useLang } from "./useLang";
import { useNow } from "./useNow";

type Props = { place: Pick<Place, "hours" | "closedToday">; now: Date | null; large?: boolean; tilt?: number };

// Et rødt stempel som i en avis: ÅBEN når der er åbent, et gråt LUKKET når der er lukket.
// Lille udgave står i listen med tiden under, stor udgave står på stedets side med tiden ved siden af.
export function OpenSign({ place, now, large, tilt = -3 }: Props) {
  const { t } = useLang();
  if (!now) return <span className={large ? "block h-9" : "block h-12 w-24"} aria-hidden />;
  const status = openStatus(place, now);
  const text = describeStatus(status, copenhagenNow(now).day, t);
  const style = { "--tilt": `${tilt}deg` } as React.CSSProperties;
  const size = large ? "px-2.5 py-1 text-base" : "px-2 py-0.5 text-[0.9rem]";
  const layout = large ? "flex flex-wrap items-center gap-x-3 gap-y-1" : "flex w-28 flex-col items-center gap-1.5 text-center";

  if (status.state === "open") {
    return (
      <span className={layout}>
        <span style={style} className={`stamp stamp-in border-[2.5px] border-stamp font-bold tracking-[0.15em] text-stamp ${size}`}>
          {t("ÅBEN")}
        </span>
        <span className={large ? "text-lg" : "text-sm"}>{large ? t("Åben til {tid} i dag", { tid: status.closesAt }) : text.replace(/^Åben /, "")}</span>
      </span>
    );
  }
  if (status.state === "closed") {
    return (
      <span className={`${layout} text-ink-soft`}>
        <span className={`border-2 border-ink-soft/50 tracking-[0.15em] ${size}`}>{t("LUKKET")}</span>
        <span className={large ? "text-lg" : "text-sm"}>{text.replace(/^[^,]*, /, "")}</span>
      </span>
    );
  }
  return <span className={`${large ? "text-lg" : "w-28 text-center text-sm"} text-ink-soft`}>{text}</span>;
}

export function LiveOpenSign(props: Omit<Props, "now">) {
  const now = useNow();
  return <OpenSign {...props} now={now} />;
}
