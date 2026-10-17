import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Restauranter logger ind i panelet med en kode. Bagefter husker en underskrevet
// cookie, hvilket sted de er logget ind på.
const COOKIE = "assensnu_panel";
const secret = process.env.PANEL_SECRET || "kun-til-afproevning";

const sign = (slug: string) => createHmac("sha256", secret).update(slug).digest("hex");

export async function loginPanel(slug: string) {
  (await cookies()).set(COOKIE, `${slug}.${sign(slug)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}

export async function logoutPanel() {
  (await cookies()).delete(COOKIE);
}

export async function panelSlug(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  const slug = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(slug));
  return given.length === expected.length && timingSafeEqual(given, expected) ? slug : null;
}
