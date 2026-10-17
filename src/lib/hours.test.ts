import { describe, expect, it } from "vitest";
import { describeStatus, openStatus } from "./hours";
import type { OpeningPeriod } from "./types";

// Fredag 16. oktober 2026, sommertid (UTC+2)
const at = (iso: string) => new Date(iso);

const pizza: OpeningPeriod[] = [
  { day: 4, open: "16:00", close: "21:00" }, // fredag
  { day: 5, open: "16:00", close: "02:00" }, // lørdag over midnat
];

describe("openStatus", () => {
  it("er ukendt uden åbningstider", () => {
    expect(openStatus({ hours: [] }).state).toBe("unknown");
  });

  it("er åben inden for åbningstiden i dansk tid", () => {
    // 17:30 i Assens = 15:30 UTC
    expect(openStatus({ hours: pizza }, at("2026-10-16T15:30:00Z"))).toEqual({ state: "open", closesAt: "21:00" });
  });

  it("er lukket før åbning og fortæller hvornår den åbner", () => {
    const status = openStatus({ hours: pizza }, at("2026-10-16T10:00:00Z"));
    expect(status).toEqual({ state: "closed", opensAt: { day: 4, time: "16:00" } });
    expect(describeStatus(status, 4)).toBe("Lukket, åbner kl. 16:00");
  });

  it("håndterer åbent over midnat", () => {
    // Søndag kl. 01:00 i Assens
    expect(openStatus({ hours: pizza }, at("2026-10-17T23:00:00Z")).state).toBe("open");
    // Søndag kl. 03:00 i Assens
    expect(openStatus({ hours: pizza }, at("2026-10-18T01:00:00Z")).state).toBe("closed");
  });

  it("respekterer 'lukket i dag'", () => {
    const status = openStatus({ hours: pizza, closedToday: true }, at("2026-10-16T15:30:00Z"));
    expect(status).toEqual({ state: "closed", opensAt: { day: 5, time: "16:00" } });
    expect(describeStatus(status, 4)).toBe("Lukket, åbner i morgen kl. 16:00");
  });
});
