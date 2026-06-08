import { route, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  addNotification,
  findUserById,
  id,
  markNotificationsRead,
  notificationsForUser,
} from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";
import { rankTrending } from "@/lib/personalization";

export const runtime = "nodejs";

export const GET = route(async () => {
  const session = await requireSession();
  const user = await findUserById(session.userId);

  // Ensure the user has notifications derived from current breaking/trending
  // news in their interests (deduped by article).
  const existing = await notificationsForUser(session.userId);
  const existingArticleIds = new Set(existing.map((n) => n.articleId));
  const interests = new Set(user?.preferences.interests ?? []);

  const articles = await getAllArticles(user?.preferences.language ?? "en");
  const candidates = rankTrending(
    articles.filter((a) => (a.breaking || a.trendingScore > 80) && (interests.size === 0 || interests.has(a.category))),
  ).slice(0, 6);

  for (const a of candidates) {
    if (existingArticleIds.has(a.id)) continue;
    await addNotification({
      id: id("ntf"),
      userId: session.userId,
      title: a.breaking ? "🚨 Breaking News" : "🔥 Trending for you",
      body: a.title,
      articleId: a.id,
      type: a.breaking ? "breaking" : "personalized",
      read: false,
      createdAt: a.publishedAt,
    });
  }

  const all = (await notificationsForUser(session.userId))
    .sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))
    .slice(0, 30);
  const unread = all.filter((n) => !n.read).length;
  return ok({ notifications: all, unread });
});

export const POST = route(async () => {
  const session = await requireSession();
  await markNotificationsRead(session.userId);
  return ok({ ok: true });
});
