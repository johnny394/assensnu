import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Små, hurtige spørgsmål til Claude: Mad-oraklet, allergidetektiven, byens stemning og "længe siden"-hilsenen.
// Nøglen ANTHROPIC_API_KEY står kun på Vercel. Uden den klarer hver funktion sig uden AI.

export const canUseAI = () => !!process.env.ANTHROPIC_API_KEY?.trim();

const MODEL = "claude-haiku-5-5";
let client: Anthropic | null = null;

/** Svar som JSON efter et skema. Kaster en fejl, hvis noget går galt, så den, der spørger, kan falde tilbage. */
export async function askJson<T>(system: string, question: string, schema: Record<string, unknown>, maxTokens = 600): Promise<T> {
  client ??= new Anthropic({ timeout: 12_000, maxRetries: 1 });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: question }],
  });
  if (message.stop_reason === "refusal") throw new Error("Claude ville ikke svare");
  if (message.stop_reason === "max_tokens") throw new Error("Svaret blev for langt");
  const block = message.content.find((b) => b.type === "text");
  if (block?.type !== "text") throw new Error("Intet svar fra Claude");
  return JSON.parse(block.text) as T;
}

// Så ingen kan bruge løs af AI'en: højst `max` spørgsmål pr. `key` i et minut, på denne server
const hits = new Map<string, number[]>();
export function tooMany(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= max) return true;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
