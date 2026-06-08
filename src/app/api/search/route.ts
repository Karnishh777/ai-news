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
  if (live.length) mergeIntoCache(lang, live); // so detail pages resolve

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

  const suggestions = Array.from(
    new Set(results.slice(0, 8).map((a) => a.title)),
  ).slice(0, 6);

  return ok({ results, suggestions, query: q, lang });
});
