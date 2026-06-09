import "server-only";

// ─────────────────────────────────────────────────────────────
// Shared Gemini client (used by the chatbot + article AI tools + briefing).
// Resilient: tries the configured model, then known-good fallbacks.
// ─────────────────────────────────────────────────────────────

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];

export function hasServerKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function resolveKey(userKey?: string): string {
  return (userKey || process.env.GEMINI_API_KEY || "").trim();
}

export function userTurn(prompt: string): GeminiContent[] {
  return [{ role: "user", parts: [{ text: prompt }] }];
}

export async function geminiChat(
  key: string,
  systemText: string,
  contents: GeminiContent[],
  maxOutputTokens = 700,
): Promise<string> {
  const primary = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  let lastErr: GeminiError = new GeminiError(0, "no models tried");

  for (const model of models) {
    try {
      return await callGemini(model, key, systemText, contents, maxOutputTokens);
    } catch (e) {
      const ge = e as GeminiError;
      lastErr = ge;
      // Auth/key errors won't be fixed by another model — stop early.
      if (ge.status === 401 || ge.status === 403 || (ge.status === 400 && /api[_ ]?key|not valid/i.test(ge.message))) {
        throw ge;
      }
    }
  }
  throw lastErr;
}

async function callGemini(
  model: string,
  key: string,
  systemText: string,
  contents: GeminiContent[],
  maxOutputTokens: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens },
    }),
  });
  if (!res.ok) throw new GeminiError(res.status, await res.text().catch(() => ""));
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
  if (!text.trim()) throw new GeminiError(0, "Empty Gemini response");
  return text.trim();
}

/** Human-friendly note for when an AI call fails. */
export function aiErrorNote(err: unknown, fromUserKey: boolean): string {
  const ge = err as GeminiError;
  const invalid =
    ge?.status === 401 || ge?.status === 403 || (ge?.status === 400 && /api[_ ]?key|not valid/i.test(ge?.message ?? ""));
  if (invalid) {
    return fromUserKey
      ? "That API key was rejected — check it and try again."
      : "The Gemini key was rejected. An admin should verify GEMINI_API_KEY.";
  }
  return "The AI service is busy right now — please try again in a moment.";
}
