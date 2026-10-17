export function supabaseOrigin(raw: string | undefined) {
  const text = raw?.trim();
  if (!text) return undefined;
  try {
    return new URL(text.startsWith("http") ? text : `https://${text}`).origin;
  } catch {
    return text;
  }
}
