import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { HIDDEN_PATHS, hostOf } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = hostOf(await headers());
  return { rules: { userAgent: "*", allow: "/", disallow: HIDDEN_PATHS }, sitemap: `https://${host}/sitemap.xml` };
}
