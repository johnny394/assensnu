import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

const on = (host: string, path: string) => middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));

describe("bynu.dk", () => {
  it("viser byvælgeren på forsiden", () => {
    expect(on("bynu.dk", "/").headers.get("x-middleware-rewrite")).toBe("https://bynu.dk/byer");
  });

  it("sender gamle links videre til Assens", () => {
    const res = on("bynu.dk", "/sted/proevepizza?x=1");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://assens.bynu.dk/sted/proevepizza?x=1");
  });

  it("viser artiklerne på bynu.dk", () => {
    expect(on("bynu.dk", "/artikel/til-spisesteder").headers.get("x-middleware-next")).toBe("1");
  });

  it("lader byernes egne adresser være", () => {
    expect(on("assens.bynu.dk", "/").headers.get("x-middleware-next")).toBe("1");
  });
});
