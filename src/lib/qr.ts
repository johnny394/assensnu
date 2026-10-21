import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

// QR-koden som SVG, så den er skarp, uanset hvor stort skiltet printes
export const qrSvg = (url: string) => QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1b1a17", light: "#0000" } });

// Adressen siden blev åbnet på, så skiltet peger rigtigt, også når assensnu.dk kommer i brug
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "assensnu.dk";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
