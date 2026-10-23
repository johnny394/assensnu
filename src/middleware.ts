import { NextResponse, type NextRequest } from "next/server";
import { BRAND_DOMAIN, TOWN_SITES } from "@/lib/site";

// bynu.dk selv viser byvælgeren og artiklerne. Alt andet på bynu.dk sendes videre til Assens, så gamle links virker.
export function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
  if (host !== BRAND_DOMAIN) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname === "/" || pathname === "/byer") return NextResponse.rewrite(new URL("/byer", req.url));
  if (pathname.startsWith("/artikel/") || pathname === "/sitemap.xml" || pathname === "/robots.txt") return NextResponse.next();
  return NextResponse.redirect(`${TOWN_SITES.Assens}${pathname}${search}`, 308);
}

export const config = { matcher: ["/((?!_next/|api/|sw.js|icon.png|favicon.ico).*)"] };
