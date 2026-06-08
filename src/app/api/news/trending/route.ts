import { route, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";
import { rankTrending } from "@/lib/personalization";

export const runtime = "nodejs";

export const GET = route(async () => {
  const session = await getSession();
  const user = session ? await findUserById(session.userId) : null;
  const lang = user?.preferences.language ?? "en";
  const articles = await getAllArticles(lang);
  const trending = rankTrending(articles).slice(0, 10);
  return ok({ articles: trending });
});
