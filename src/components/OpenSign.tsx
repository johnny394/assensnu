"use client";

import { copenhagenNow, describeStatus, openStatus } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { useNow } from "./useNow";

type Props = { place: Pick<Place, "hours" | "closedToday">; now: Date | null; large?: boolean };

// Et lille butiksskilt: lyser gult, når der er åbent, og er slukket, når der er lukket
export function OpenSign({ place, now, large }: Props) {
  if (!now) return <span className={large ? "block h-14" : "block h-11"} aria-hidden />;
  const status = openStatus(place, now);
  const text = describeStatus(status, copenhagenNow(now).day);
  const size = large ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1";

  if (status.state === "open") {
    return (
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={`sign-lit rounded-md border-2 border-buoy-deep bg-buoy font-display font-extrabold tracking-[0.18em] text-ink shadow-[0_0_14px_2px_rgba(255,200,69,0.55)] ${size}`}>
          ÅBEN
        </span>
        <span className="text-ink">{text}</span>
      </span>
    );
  }
  if (status.state === "closed") {
    return (
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={`rounded-md border-2 border-line font-display font-extrabold tracking-[0.18em] text-ink-soft/60 ${size}`}>LUKKET</span>
        <span className="text-ink-soft">{text.replace(/^Lukket, /, "")}</span>
      </span>
    );
  }
  return <span className="text-ink-soft">{text}</span>;
}

export function LiveOpenSign(props: Omit<Props, "now">) {
  const now = useNow();
  return <OpenSign {...props} now={now} />;
}
