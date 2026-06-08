import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";
import { liveSearch } from "@/lib/news/rss";
import { rankTrending } from "@/lib/personalization";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Article, Language } from "@/types";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM = `You are "NewsFlow Helper", a friendly, concise assistant embedded in NewsFlow AI — an AI-personalized news app.
You help users: navigate features (personalized For-You feed, category sections, trending, search, bookmarks/Library, dark mode + accent themes, language, settings), understand or summarize the news, and set things up (deploy to Netlify, add Upstash for durable storage, add a Gemini API key to enable AI).
Be warm and brief (2-5 sentences, use bullet points when listing steps). When current headlines are provided, use them to answer "what's happening" questions and cite the source name. Never invent URLs.`;

export const POST = route(async (req: NextRequest) => {
  if (!rateLimit(`assistant:${clientIp(req)}`, 20, 60_000).ok)
    return fail("You're sending messages too fast. Please wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[]; apiKey?: string };
  const messages = (body.messages ?? []).slice(-10).filter((m) => m?.content?.trim());
  if (!messages.length) return fail("No message provided", 422);

  const session = await getSession();
  const user = session ? await findUserById(session.userId) : null;
  const lang: Language = user?.preferences.language ?? "en";
  const last = messages[messages.length - 1].content.trim();

  const key = (body.apiKey || process.env.GEMINI_API_KEY || "").trim();

  if (key) {
    try {
      const headlines = await topHeadlines(lang);
      const reply = await askGemini(key, messages, headlines);
      return ok({ reply, source: "gemini", aiEnabled: true });
    } catch (err) {
      console.error("[assistant] Gemini failed, using built-in helper:", err);
      const reply = await builtin(last, lang);
      return ok({ reply, source: "builtin", aiEnabled: false, note: "AI key failed — using the built-in guide." });
    }
  }

  const reply = await builtin(last, lang);
  return ok({ reply, source: "builtin", aiEnabled: false });
});

// ── Gemini ──

async function askGemini(key: string, messages: ChatMessage[], headlines: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const systemText = headlines ? `${SYSTEM}\n\nCurrent top headlines:\n${headlines}` : SYSTEM;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
  if (!text.trim()) throw new Error("Empty Gemini response");
  return text.trim();
}

async function topHeadlines(lang: Language): Promise<string> {
  try {
    const arts = rankTrending(await getAllArticles(lang)).slice(0, 10);
    return arts.map((a) => `- ${a.title} (${a.source.name}, ${a.category})`).join("\n");
  } catch {
    return "";
  }
}

// ── Built-in helper (no key required) ──

async function builtin(message: string, lang: Language): Promise<string> {
  const m = message.toLowerCase();
  const has = (...k: string[]) => k.some((x) => m.includes(x));

  if (has("hello", "hi ", "hey", "what can you", "help", "who are you") && m.length < 40) {
    return [
      "👋 I'm your **NewsFlow Helper**. I can:",
      "• Explain features — feed, themes, language, bookmarks, search",
      "• Tell you **what's trending** or news about a topic",
      "• Help you **deploy**, add a **database**, or **enable AI**",
      "",
      "Try: *“what's trending?”* or *“how do I change language?”*",
    ].join("\n");
  }
  if (has("language", "tamil", "hindi", "telugu", "malayalam", "kannada", "translate")) {
    return "To read news in another language: open **Settings → Reading & alerts → Language** and pick one (Tamil, Hindi, Telugu, Malayalam, Kannada or English). Your feed reloads in that language automatically.";
  }
  if (has("theme", "color", "dark", "light", "playstation", "appearance", "look")) {
    return "Open **Settings → Appearance**. Toggle **Light/Dark**, then pick an accent theme — 🎮 PlayStation, 👾 Cyberpunk, 📈 Markets, 🎬 Cinema, 🏟️ Arena, and more. You can also change the **text size** there.";
  }
  if (has("bookmark", "save", "library", "read later")) {
    return "Tap the **bookmark icon** on any news card to save it. Find everything you saved (plus your reading history) under **Library** in the sidebar.";
  }
  if (has("deploy", "netlify", "host", "publish", "vercel")) {
    return [
      "To deploy on **Netlify**:",
      "1. Push your code to GitHub (already done ✅).",
      "2. Netlify → *Add new site → Import an existing project* → pick your repo.",
      "3. It auto-detects the build (netlify.toml). Click **Deploy**.",
      "4. Add env vars (JWT_SECRET, Upstash, Resend), then redeploy.",
    ].join("\n");
  }
  if (has("database", "upstash", "persist", "storage", "save account", "redis", "supabase", "postgres")) {
    return [
      "For durable accounts/bookmarks, add **Upstash Redis** (free):",
      "1. Create a Redis DB at upstash.com → **REST API** tab.",
      "2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.",
      "3. Add both in **Netlify → Environment variables**, then redeploy.",
      "The app switches to Redis automatically — no code changes.",
    ].join("\n");
  }
  if (has("api key", "gemini", "enable ai", "openai", "chatbot ai", "real ai", "smarter")) {
    return [
      "Want real AI answers? Add a **free Gemini key**:",
      "1. Get one at **aistudio.google.com → Get API key**.",
      "2. Click the **🔑 key icon** at the top of this chat and paste it.",
      "Then I can answer questions about any topic and summarize the news. (Admins can also set `GEMINI_API_KEY` in Netlify for everyone.)",
    ].join("\n");
  }
  if (has("search", "find")) {
    return "Use the **search bar** at the top (or the Search tab). It now queries live news for any topic, company, person, or event — in your selected language. Suggestions appear as you type.";
  }

  // News questions → live search and summarize.
  if (has("trending", "latest", "what's happening", "whats happening", "headlines", "news about", "news on", "tell me about", "what is happening", "update on")) {
    const topic = extractTopic(message);
    const arts = topic ? await liveSearch(topic, lang) : rankTrending(await getAllArticles(lang)).slice(0, 5);
    const top = arts.slice(0, 4);
    if (!top.length) return "I couldn't pull live stories just now — try again in a moment, or open the feed for the latest.";
    const lines = top.map((a: Article) => `• **${a.title}** — ${a.source.name}`);
    return [`Here's the latest${topic ? ` on **${topic}**` : ""}:`, ...lines, "", "Open any card in the feed to read more."].join("\n");
  }

  // Fallback
  return [
    "I can help you use NewsFlow — features, themes, language, bookmarks, search, deploying, or adding a database.",
    "For AI answers about **any topic**, add a free Gemini key with the 🔑 icon above.",
    "Try: *“what's trending?”*, *“change language”*, or *“how do I deploy?”*",
  ].join("\n");
}

function extractTopic(message: string): string {
  const m = message.toLowerCase();
  const markers = ["news about", "news on", "tell me about", "update on", "about "];
  for (const mk of markers) {
    const i = m.indexOf(mk);
    if (i >= 0) return message.slice(i + mk.length).replace(/[?.!]/g, "").trim();
  }
  return "";
}
