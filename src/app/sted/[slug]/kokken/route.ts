import { decodePhoto } from "@/lib/chef";
import { store } from "@/lib/store";

// Billedet til Mød kokken. Adressen skifter (?v=), når billedet skiftes, så det må gemmes længe.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const photo = await store.getChefPhoto(slug).catch(() => null);
  const decoded = photo ? decodePhoto(photo) : null;
  if (!decoded) return new Response("Ikke fundet", { status: 404 });
  return new Response(new Uint8Array(decoded.bytes), {
    headers: { "content-type": decoded.type, "cache-control": "public, max-age=31536000, immutable" },
  });
}
