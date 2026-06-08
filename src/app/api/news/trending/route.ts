import { route, ok } from "@/lib/api";
import { getAllArticles } from "@/lib/news/provider";
import { rankTrending } from "@/lib/personalization";

export const runtime = "nodejs";

export const GET = route(async () => {
  const articles = await getAllArticles();
  const trending = rankTrending(articles).slice(0, 10);
  return ok({ articles: trending });
});
