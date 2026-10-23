"use client";

import { useEffect, useState } from "react";
import { HomeScreenGuide } from "./HomeScreenGuide";
import { phoneSubscription } from "./phone-push";
import { useFavorites } from "./useFavorites";
import { useLang } from "./useLang";
import { SITE } from "@/lib/site";

const KEY = "assensnu:folger";

function readFollowing(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeFollowing(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

type State = "loading" | "idle" | "working" | "following" | "ios" | "denied" | "failed";

// Følg et sted og få besked på telefonen, når de lægger dagens tilbud ud.
// Ingen profil: telefonen husker selv, hvem man følger.
export function FollowButton({ slug, name, publicKey }: { slug: string; name: string; publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const { favorites, toggle } = useFavorites();
  const { t } = useLang();

  useEffect(() => {
    setState(readFollowing().includes(slug) ? "following" : "idle");
  }, [slug]);

  if (!publicKey || state === "loading") return null;

  const send = async (stop: boolean) => {
    const subscription = await phoneSubscription(publicKey);
    if (typeof subscription === "string") return false;
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, subscription, stop }),
    }).catch(() => null);
    return !!res?.ok;
  };

  const follow = async () => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) return setState("ios");
    if (!("Notification" in window)) return setState("failed");
    setState("working");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setState("denied");
    if (!(await send(false))) return setState("failed");
    writeFollowing([...readFollowing().filter((s) => s !== slug), slug]);
    if (!favorites.includes(slug)) toggle(slug);
    setState("following");
  };

  const unfollow = async () => {
    setState("working");
    await send(true);
    writeFollowing(readFollowing().filter((s) => s !== slug));
    setState("idle");
  };

  if (state === "ios") {
    return (
      <div className="mt-5">
        <HomeScreenGuide
          title={t("Følg {navn}", { navn: name })}
          text=""
          iosLastStep={t("Åbn {navn} fra det nye ikon, og tryk Følg igen", { navn: name })}
          iosNote=""
        />
      </div>
    );
  }

  if (state === "following") {
    return (
      <div className="mt-5 border-2 border-ink px-4 py-3 text-lg">
        <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="font-bold">{t("✓ Du følger {navn}", { navn: name })}</span>
          <button onClick={unfollow} className="text-ink-soft underline">
            {t("Stop")}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        onClick={follow}
        disabled={state === "working"}
        className="flex min-h-14 w-full items-center gap-3 border-2 border-stamp bg-stamp-soft px-4 py-3 text-left disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-stamp" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0" />
        </svg>
        <span>
          <span className="block text-lg font-bold text-stamp">{state === "working" ? t("Et øjeblik …") : t("Følg {navn}", { navn: name })}</span>
          <span className="block text-ink-soft">{t("Få besked om dagens tilbud. Højst én om dagen.")}</span>
        </span>
      </button>
      {state === "denied" && <p className="mt-2 font-bold text-stamp">{t("Telefonen har sagt nej til beskeder fra {site}. Det kan ændres under telefonens indstillinger.", { site: SITE })}</p>}
      {state === "failed" && <p className="mt-2 font-bold text-stamp">{t("Det lykkedes ikke at slå beskeder til på denne telefon. Prøv igen senere.")}</p>}
    </div>
  );
}
