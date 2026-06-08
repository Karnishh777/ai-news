import { NextRequest } from "next/server";
import { route, ok } from "@/lib/api";
import { getAllArticles } from "@/lib/news/provider";
import { rankTrending } from "@/lib/personalization";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return ok({ results: [], suggestions: [] });

  const articles = await getAllArticles();
  const terms = q.split(/\s+/);

  const scored = articles
    .map((a) => {
      const haystack = `${a.title} ${a.summary} ${a.tags.join(" ")} ${a.source.name} ${a.category}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (a.title.toLowerCase().includes(t)) score += 5;
        else if (haystack.includes(t)) score += 2;
      }
      return { a, score };
    })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score);

  const results = rankTrending(scored.map((s) => s.a)).slice(0, 30);

  // Instant suggestions from the top matches' titles + tags.
  const suggestions = Array.from(
    new Set(
      scored
        .slice(0, 8)
        .flatMap((s) => [s.a.title, ...s.a.tags])
        .filter((x) => x.toLowerCase().includes(terms[0])),
    ),
  ).slice(0, 6);

  return ok({ results, suggestions });
});
