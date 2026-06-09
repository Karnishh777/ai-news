import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";
import { rankArticles } from "@/lib/personalization";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { GeminiError, aiErrorNote, geminiChat, hasServerKey, resolveKey, userTurn } from "@/lib/ai";
import type { Language } from "@/types";

export const runtime = "nodejs";

type Mode = "explain" | "why" | "perspectives" | "bias" | "ask" | "briefing" | "quiz";

interface Body {
  mode: Mode;
  apiKey?: string;
  question?: string;
  article?: { title?: string; summary?: string; content?: string; source?: string };
}

const SYSTEM =
  "You are NewsFlow's AI news analyst. Be accurate, neutral and concise. " +
  "Base your answer ONLY on the provided article text; if it doesn't contain the answer, say so briefly. " +
  "Never invent facts, quotes, or numbers. Use short paragraphs or bullets.";

export const POST = route(async (req: NextRequest) => {
  if (!rateLimit(`ai:${clientIp(req)}`, 25, 60_000).ok)
    return fail("Too many AI requests — please wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as Body;
  const mode = body.mode;
  if (!mode) return fail("Missing mode", 422);

  const key = resolveKey(body.apiKey);
  if (!key) {
    return ok({
      ok: false,
      needsKey: true,
      reply:
        "✨ This is an AI feature. Add a free **Gemini** key (aistudio.google.com) via the 🔑 in the chat helper, or ask an admin to set GEMINI_API_KEY.",
    });
  }

  const session = await getSession();
  const user = session ? await findUserById(session.userId) : null;
  const lang: Language = user?.preferences.language ?? "en";

  try {
    if (mode === "briefing") {
      const articles = await getAllArticles(lang);
      const ranked = rankArticles(articles, {
        prefs: user?.preferences ?? { interests: [], language: lang, newsLength: "short", notification: "both" },
        interactions: [],
      }).slice(0, 12);
      const list = ranked.map((a, i) => `${i + 1}. ${a.title} — ${a.source.name} (${a.category})`).join("\n");
      const prompt =
        `Today's top stories for this reader:\n${list}\n\n` +
        "Write a warm, skimmable personal news briefing (~150 words). Lead with the single most important story, " +
        "then group the rest into 2-3 themed lines. End with one forward-looking line. No preamble, no markdown headers.";
      const reply = await geminiChat(key, "You are NewsFlow's friendly morning-briefing writer. Be vivid but factual.", userTurn(prompt), 500);
      return ok({ ok: true, reply });
    }

    if (mode === "quiz") {
      const articles = await getAllArticles(lang);
      const ranked = rankArticles(articles, {
        prefs: user?.preferences ?? { interests: [], language: lang, newsLength: "short", notification: "both" },
        interactions: [],
      }).slice(0, 14);
      const list = ranked.map((a) => `- ${a.title} (${a.source.name})`).join("\n");
      const prompt =
        `Recent headlines:\n${list}\n\n` +
        'Create 4 fun multiple-choice questions testing whether the reader followed today\'s news. ' +
        'Return ONLY a JSON array (no markdown, no prose). Each item: ' +
        '{"q": string, "options": [4 short strings], "answer": <0-3 index of correct option>, "explain": short string}. ' +
        "Make questions answerable from the headlines above; keep options plausible.";
      const raw = await geminiChat(key, "You write concise, accurate news quizzes. Output strict JSON only.", userTurn(prompt), 900);
      const quiz = parseQuiz(raw);
      if (!quiz.length) return ok({ ok: false, reply: "Couldn't build a quiz right now — try again." });
      return ok({ ok: true, quiz });
    }

    // Article-grounded modes
    const a = body.article;
    if (!a?.title) return fail("Missing article", 422);
    const articleText = `TITLE: ${a.title}\nSOURCE: ${a.source ?? "unknown"}\nSUMMARY: ${a.summary ?? ""}\nBODY: ${a.content ?? ""}`;

    let instruction: string;
    if (mode === "explain") instruction = "Explain this story in 3 simple sentences anyone can understand. Avoid jargon.";
    else if (mode === "why") instruction = "In 3 short bullet points: why does this matter, and who is affected?";
    else if (mode === "perspectives")
      instruction =
        "Give 2-3 balanced perspectives or angles on this story, each one line. If the article is opinion or one-sided, note that.";
    else if (mode === "bias")
      instruction =
        "Assess tone and bias fairly in exactly 3 short lines:\n1) Sentiment: positive / neutral / negative\n2) Leaning: any political or one-sided framing, or 'appears balanced'\n3) Why: one short reason. Don't overclaim.";
    else if (mode === "ask") {
      const q = (body.question ?? "").trim();
      if (!q) return fail("Missing question", 422);
      instruction = `Answer this reader question using only the article: "${q}"`;
    } else return fail("Unknown mode", 422);

    const reply = await geminiChat(key, SYSTEM, userTurn(`${articleText}\n\nTASK: ${instruction}`), 500);
    return ok({ ok: true, reply });
  } catch (err) {
    console.error("[ai] failed:", (err as GeminiError)?.status, (err as Error)?.message);
    return ok({ ok: false, reply: `⚠️ ${aiErrorNote(err, Boolean(body.apiKey))}`, error: true });
  }
});

export const GET = route(async () =>
  ok({ aiEnabled: hasServerKey() }),
);

interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

function parseQuiz(raw: string): QuizItem[] {
  try {
    const cleaned = raw.replace(/```json|```/gi, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start < 0 || end < 0) return [];
    const arr = JSON.parse(cleaned.slice(start, end + 1)) as QuizItem[];
    return arr
      .filter((x) => x?.q && Array.isArray(x.options) && x.options.length >= 2 && typeof x.answer === "number")
      .map((x) => ({ q: x.q, options: x.options.slice(0, 4), answer: Math.max(0, Math.min(3, x.answer)), explain: x.explain }))
      .slice(0, 5);
  } catch {
    return [];
  }
}
