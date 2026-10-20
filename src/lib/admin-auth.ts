import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDemo } from "./store";

// Johnnys eget panel. Koden står kun på Vercel som ADMIN_KODE. Ved afprøvning uden database er den 1234.
const COOKIE = "assensnu_admin";
const secret = process.env.PANEL_SECRET || "kun-til-afproevning";

export const adminCode = () => {
  const code = process.env.ADMIN_KODE?.trim();
  if (code && code.length >= 8) return code;
  return isDemo ? "1234" : null;
};

// Skiftes koden, bliver gamle logins ugyldige
const sign = () => createHmac("sha256", secret).update(`admin:${adminCode()}`).digest("hex");

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkAdminCode(code: string) {
  const expected = adminCode();
  return Boolean(expected) && same(code.trim(), expected!);
}

export async function loginAdmin() {
  (await cookies()).set(COOKIE, sign(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function logoutAdmin() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value && adminCode() && same(value, sign()));
}
