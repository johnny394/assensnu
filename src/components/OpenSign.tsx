"use client";

import { copenhagenNow, describeStatus, openStatus } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { useNow } from "./useNow";

type Props = { place: Pick<Place, "hours" | "closedToday">; now: Date | null; large?: boolean };

// Et lille butiksskilt: lyser gult, når der er åbent, og er slukket, når der er lukket
export function OpenSign({ place, now, large }: Props) {
  if (!now) return <span className={large ? "block h-10" : "block h-7"} aria-hidden />;
  const status = openStatus(place, now);
  const text = describeStatus(status, copenhagenNow(now).day);
  const size = large ? "text-[0.8rem] px-2.5 py-1" : "text-[0.68rem] px-2 py-[0.2rem]";
  const label = large ? "text-lg" : "text-[0.95rem]";

  if (status.state === "open") {
    return (
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={`sign-lit rounded-[0.4rem] bg-buoy font-display font-extrabold tracking-[0.16em] text-ink shadow-[0_0_14px_1px_rgba(247,197,72,0.6)] ${size}`}>
          ÅBEN
        </span>
        <span className={`font-bold text-ink ${label}`}>{text}</span>
      </span>
    );
  }
  if (status.state === "closed") {
    return (
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={`rounded-[0.4rem] border-[1.5px] border-ink-soft/30 font-display font-extrabold tracking-[0.16em] text-ink-soft/70 ${size}`}>LUKKET</span>
        <span className={`text-ink-soft ${label}`}>{text.replace(/^Lukket, /, "")}</span>
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-2 text-ink-soft ${label}`}>
      <span className="h-2 w-2 rounded-full border-[1.5px] border-ink-soft/50" aria-hidden />
      {text}
    </span>
  );
}

export function LiveOpenSign(props: Omit<Props, "now">) {
  const now = useNow();
  return <OpenSign {...props} now={now} />;
}
