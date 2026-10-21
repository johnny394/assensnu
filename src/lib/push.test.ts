import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { endpoint: string; payload: string }[] = [];
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (s: { endpoint: string }, payload: string) => void sent.push({ endpoint: s.endpoint, payload }),
  },
}));

describe("beskeder på kundens sprog", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
  });

  it("sender 'maden er klar' på tysk til en tysk turist", async () => {
    const { store } = await import("./store");
    const { notify } = await import("./push");
    const id = "11111111-1111-1111-1111-111111111111";
    await store.savePush({ kind: "order", id }, { endpoint: "https://push.example/de", keys: { p256dh: "p", auth: "a" }, lang: "de" });
    await notify({ kind: "order", id }, (t) => ({ title: t("{navn}: maden er klar", { navn: "Café Banken" }), body: t("Ordre {n} kan hentes nu.", { n: 12 }), url: "/" }));
    expect(JSON.parse(sent[0].payload).title).toBe("Café Banken: Ihr Essen ist fertig");
    expect(sent[0]).not.toHaveProperty("lang");
  });
});
