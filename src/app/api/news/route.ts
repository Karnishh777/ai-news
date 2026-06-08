import { NextRequest } from "next/server";
import { route, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getAllArticles, mergeIntoCache } from "@/lib/news/provider";
import { liveSearch } from "@/lib/news/rss";
import { interactionsForUser, findUserById, historyForUser } from "@/lib/db";
import { groupByCategory, rankArticles } from "@/lib/personalization";
import type { Article, CategorySlug, UserPreferences } from "@/types";
import { CATEGORIES } from "@/lib/news/categories";
import { ensureSeeded } from "@/lib/seed-memory";

export const runtime = "nodejs";

const GUEST_PREFS: UserPreferences = {
  interests: ["technology", "ai", "world", "business", "sports"],
  language: "en",
  newsLength: "short",
  notification: "both",
};

export const GET = route(async (req: NextRequest) => {
  await ensureSeeded();
  const url = new URL(req.url);
  const category = url.searchParams.get("category") as CategorySlug | null;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(40, Math.max(1, Number(url.searchParams.get("pageSize") ?? 18)));
  const grouped = url.searchParams.get("grouped") === "1";

  const session = await getSession();
  const user = session ? await findUserById(session.userId) : null;
  const prefs = user?.preferences ?? GUEST_PREFS;
  const interactions = user ? await interactionsForUser(user.id) : [];
  const seen = new Set(user ? await historyForUser(user.id) : []);

  let articles: Article[];
  if (category === "local") {
    // Local news is driven by the user's saved location (not a generic feed).
    const loc = (user?.preferences.location ?? "").trim();
    const query = loc ? `${loc} news` : "local news today";
    articles = await liveSearch(query, prefs.language, "local");
    if (articles.length) await mergeIntoCache(prefs.language, articles); // so detail pages resolve
  } else {
    articles = await getAllArticles(prefs.language);
    if (category) articles = articles.filter((a) => a.category === category);
  }

  const ranked = rankArticles(articles, { prefs, interactions, seenArticleIds: seen });

  if (grouped) {
    const order = (prefs.interests.length ? prefs.interests : CATEGORIES.map((c) => c.slug)) as CategorySlug[];
    const groups = groupByCategory(ranked, order);
    const sections = Object.entries(groups).map(([slug, items]) => ({
      category: slug,
      articles: items.slice(0, 8),
    }));

    // Replace the "local" rail with real location-based news when relevant.
    if (order.includes("local")) {
      const loc = (user?.preferences.location ?? "").trim();
      const localArts = await liveSearch(loc ? `${loc} news` : "local news today", prefs.language, "local");
      if (localArts.length) {
        await mergeIntoCache(prefs.language, localArts);
        const idx = sections.findIndex((s) => s.category === "local");
        const entry = { category: "local", articles: localArts.slice(0, 8) };
        if (idx >= 0) sections[idx] = entry;
        else sections.push(entry);
      }
    }

    return ok({ sections });
  }

  const start = (page - 1) * pageSize;
  const slice = ranked.slice(start, start + pageSize);
  return ok({
    articles: slice,
    page,
    pageSize,
    total: ranked.length,
    hasMore: start + pageSize < ranked.length,
  });
});
