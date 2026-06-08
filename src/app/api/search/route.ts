import { NextRequest } from "next/server";
import { route, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { getAllArticles, mergeIntoCache } from "@/lib/news/provider";
import { liveSearch } from "@/lib/news/rss";
import { rankTrending } from "@/lib/personalization";
import type { Article } from "@/types";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ results: [], suggestions: [] });

  const session = await getSession();
  const user = session ? await findUserById(session.userId) : null;
  const lang = user?.preferences.language ?? "en";
  const terms = q.toLowerCase().split(/\s+/);

  // 1) Live results for the exact query (any topic / person / company).
  const live = await liveSearch(q, lang);
  if (live.length) await mergeIntoCache(lang, live); // so detail pages resolve

  // 2) Local pool matches (already-loaded headlines).
  const pool = await getAllArticles(lang);
  const localMatches = pool.filter((a) => {
    const hay = `${a.title} ${a.summary} ${a.tags.join(" ")} ${a.source.name} ${a.category}`.toLowerCase();
    return terms.some((t) => hay.includes(t));
  });

  // 3) Merge, de-dupe by id, rank by recency/relevance.
  const byId = new Map<string, Article>();
  for (const a of [...live, ...localMatches]) if (!byId.has(a.id)) byId.set(a.id, a);
  const results = rankTrending([...byId.values()]).slice(0, 40);

  return ok({ results, suggestions: buildSuggestions(results, q), query: q, lang });
});

/** Concise "related searches" — frequent proper nouns from result titles. */
function buildSuggestions(results: Article[], q: string): string[] {
  const ql = q.toLowerCase();
  const freq = new Map<string, number>();
  for (const a of results.slice(0, 24)) {
    const matches = a.title.match(/\b[A-Z][a-zA-Z0-9.]+(?:\s[A-Z][a-zA-Z0-9.]+){0,2}\b/g) ?? [];
    for (const raw of matches) {
      const m = raw.trim();
      if (m.length < 3 || m.length > 26) continue;
      if (m.toLowerCase() === ql || ql.includes(m.toLowerCase())) continue;
      freq.set(m, (freq.get(m) ?? 0) + 1);
    }
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  // Fallback to tags (covers non-Latin scripts where capitalization doesn't apply).
  if (top.length < 3) {
    const tags = new Set<string>();
    for (const a of results.slice(0, 12)) for (const t of a.tags) if (t !== "google news") tags.add(t);
    return [...new Set([...top, ...tags])].slice(0, 6);
  }
  return top.slice(0, 8);
}
