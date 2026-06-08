import { route, ok, fail } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getAllUsers, getInteractionCountsByType, getTotals } from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";
import { rankTrending } from "@/lib/personalization";
import type { CategorySlug, InteractionType } from "@/types";

export const runtime = "nodejs";

export const GET = route(async () => {
  const session = await requireSession();
  if (session.role !== "admin") return fail("Admin access required", 403);

  const [users, byType, totals] = await Promise.all([
    getAllUsers(),
    getInteractionCountsByType(),
    getTotals(),
  ]);
  const totalUsers = users.length;
  const onboarded = users.filter((u) => u.onboarded).length;

  // Interest distribution across users
  const interestCounts: Record<string, number> = {};
  for (const u of users)
    for (const c of u.preferences.interests)
      interestCounts[c] = (interestCounts[c] ?? 0) + 1;
  const topInterests = Object.entries(interestCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, count]) => ({ category: category as CategorySlug, count }));

  // Trending topics from the live pool
  const articles = await getAllArticles();
  const trending = rankTrending(articles)
    .slice(0, 8)
    .map((a) => ({ id: a.id, title: a.title, category: a.category, score: a.trendingScore }));

  // Synthetic-but-deterministic 14-day growth curve seeded by real totals
  const today = new Date();
  const growth = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - idx));
    const base = Math.max(1, Math.round((totalUsers + 4) * (0.25 + idx / 18)));
    return { date: d.toISOString().slice(5, 10), users: base };
  });

  return ok({
    kpis: {
      totalUsers,
      onboarded,
      interactions: totals.interactions,
      bookmarks: totals.bookmarks,
      articles: articles.length,
    },
    engagement: ["view", "click", "like", "save", "share", "category_open"].map((t) => ({
      type: t as InteractionType,
      count: byType[t] ?? 0,
    })),
    topInterests,
    trending,
    growth,
    sources: [...new Set(articles.map((a) => a.source.name))].slice(0, 12),
  });
});
