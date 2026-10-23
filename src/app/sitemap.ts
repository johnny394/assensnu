import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { hostOf, sitemapEntries } from "@/lib/seo";
import { BRAND_DOMAIN } from "@/lib/site";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = hostOf(await headers());
  const places = host === BRAND_DOMAIN ? [] : await store.getPlaces();
  return sitemapEntries(host, places);
}
