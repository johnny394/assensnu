import { afterEach, describe, expect, it, vi } from "vitest";

describe("nabobyer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Glamsbjerg viser vej til Assens", async () => {
    vi.stubEnv("NEXT_PUBLIC_BY", "Glamsbjerg");
    const { NEARBY, SITE } = await import("./site");
    expect(SITE).toBe("GlamsbjergNu");
    expect(NEARBY).toEqual([{ name: "Assens", url: "https://assensnu-xiku.vercel.app" }]);
  });

  it("Assens viser ingen boks", async () => {
    vi.stubEnv("NEXT_PUBLIC_BY", "");
    const { NEARBY } = await import("./site");
    expect(NEARBY).toEqual([]);
  });
});
