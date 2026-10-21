"use client";

import { useEffect, useState } from "react";
import { phoneSubscription } from "./phone-push";
import { useLang } from "./useLang";
import { SITE } from "@/lib/site";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export type PushFor = { kind: "order" | "booking"; id: string; publicKey: string | null };

type PushState = "pending" | "ok" | "no-key" | "unsupported" | "failed";

// Melder telefonen til beskeder om netop denne bestilling, så de kommer, selv om siden er lukket
async function subscribe(push: PushFor): Promise<PushState> {
  if (!push.publicKey) return "no-key";
  const subscription = await phoneSubscription(push.publicKey);
  if (typeof subscription === "string") return subscription;
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: push.kind, id: push.id, subscription }),
  }).catch(() => null);
  return res?.ok ? "ok" : "failed";
}

// Beder om lov til at give besked, når restauranten svarer. Skal ses med det samme.
// På iPhone virker beskeder fra en hjemmeside kun fra hjemmeskærmen, så der vises vejen dertil.
export function HomeScreenGuide({ title, text, push, iosLastStep = "Bestil fremover fra det nye ikon, så får du besked", iosNote = "Denne gang siger siden her til, når maden er klar, hvis du holder den åben." }: { title: string; text: string; push?: PushFor; iosLastStep?: string; iosNote?: string }) {
  const { t } = useLang();
  const [platform, setPlatform] = useState<"ios" | "other" | "installed" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [notify, setNotify] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setPlatform(standalone ? "installed" : ios ? "ios" : "other");
    if ("Notification" in window) setNotify(Notification.permission);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const [pushState, setPushState] = useState<PushState>("pending");
  const pushKind = push?.kind;
  const pushId = push?.id;
  const pushKey = push?.publicKey ?? null;
  useEffect(() => {
    if (notify === "granted" && pushKind && pushId) subscribe({ kind: pushKind, id: pushId, publicKey: pushKey }).then(setPushState);
  }, [notify, pushKind, pushId, pushKey]);

  if (!platform) return null;

  const ask = notify === "default";
  const status =
    notify === "granted" ? (
      !push || pushState === "ok" ? (
        <p className="font-bold text-go">{t("✓ Du får besked på denne telefon, også når den er låst.")}</p>
      ) : pushState === "pending" ? (
        <p className="text-ink-soft">{t("Slår beskeder til …")}</p>
      ) : (
        <p className="font-bold text-stamp">
          {t(
            pushState === "no-key"
              ? `Beskeder er ikke sat op på ${SITE} endnu. Hold siden her åben, så siger den til.`
              : pushState === "unsupported"
                ? "Telefonen kan ikke få beskeder herfra. Hold siden her åben, så siger den til."
                : "Beskeder kunne ikke slås til. Hold siden her åben, så siger den til.",
          )}
        </p>
      )
    ) : notify === "denied" ? (
      <p className="font-bold text-stamp">{t("Du har sagt nej til beskeder fra {site}. Det kan ændres under telefonens indstillinger.", { site: SITE })}</p>
    ) : null;

  // Har kunden allerede svaret, er en enkelt linje nok
  if (!ask && (platform === "installed" || platform === "other")) return status;

  return (
    <div className="border-[3px] border-stamp bg-stamp-soft px-5 py-5 text-lg">
      <p className="flex items-center gap-2 font-display text-2xl font-black leading-tight tracking-tight text-stamp">
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0" />
        </svg>
        {title}
      </p>
      {platform === "ios" ? (
        <>
          <p className="mt-2">{t("På iPhone skal {site} ligge på hjemmeskærmen, før den kan give besked:", { site: SITE })}</p>
          <ol className="mt-4 space-y-3">
            <li className="flex items-center gap-3">
              <Step n={1} />
              <span>
                {t("Tryk på")} <strong>{t("Del")}</strong>
                <svg viewBox="0 0 24 24" className="mx-1 inline h-6 w-6 align-[-5px] text-stamp" fill="none" stroke="currentColor" strokeWidth="2" aria-label={t("Del")}>
                  <path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" />
                </svg>
                {t("nederst i Safari")}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Step n={2} />
              <span>
                {t("Vælg")} <strong>{t("Føj til hjemmeskærm")}</strong> {t("og tryk")} <strong>{t("Tilføj")}</strong>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Step n={3} />
              <span>{t(iosLastStep)}</span>
            </li>
          </ol>
          {iosNote && <p className="mt-4 text-ink-soft">{t(iosNote)}</p>}
        </>
      ) : (
        <>
          <p className="mt-1">{text}</p>
          <button
            onClick={async () => setNotify(await Notification.requestPermission())}
            className="mt-4 w-full bg-stamp px-5 py-4 text-xl font-bold text-paper"
          >
            {t("Ja tak, giv mig besked")}
          </button>
          {platform === "other" && installPrompt && (
            <button onClick={() => installPrompt.prompt()} className="mt-3 w-full border-2 border-ink px-5 py-3 text-lg font-bold">
              {t("Læg {site} på hjemmeskærmen", { site: SITE })}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-bold text-white">{n}</span>;
}
