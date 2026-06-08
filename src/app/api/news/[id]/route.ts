import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";
import { rankArticles } from "@/lib/personalization";

export const runtime = "nodejs";

export const GET = route(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const session = await getSession();
    const user = session ? await findUserById(session.userId) : null;
    const lang = user?.preferences.language ?? "en";
    const articles = await getAllArticles(lang);
    const article = articles.find((a) => a.id === id || a.slug === id);
    if (!article) return fail("Article not found", 404);

    // Related: same category, ranked by trending, excluding the current one.
    const related = rankArticles(
      articles.filter((a) => a.category === article.category && a.id !== article.id),
      {
        prefs: {
          interests: [article.category],
          language: article.language,
          newsLength: "short",
          notification: "both",
        },
        interactions: [],
      },
    ).slice(0, 6);

    return ok({ article, related });
  },
);
