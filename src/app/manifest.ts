import type { MetadataRoute } from "next";
import { CITY, SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE}`,
    short_name: `${SITE}`,
    description: `Hvem har åbent i ${CITY}? Mad, takeaway og bordbooking.`,
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee2",
    theme_color: "#f3eee2",
    lang: "da",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
