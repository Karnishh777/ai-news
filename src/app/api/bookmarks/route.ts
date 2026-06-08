import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { bookmarkSchema, fieldErrors } from "@/lib/validation";
import {
  addBookmark,
  bookmarksForUser,
  historyForUser,
  removeBookmark,
} from "@/lib/db";
import { getAllArticles } from "@/lib/news/provider";

export const runtime = "nodejs";

export const GET = route(async () => {
  const session = await requireSession();
  const articles = await getAllArticles();
  const byId = new Map(articles.map((a) => [a.id, a]));

  const saved = (await bookmarksForUser(session.userId))
    .map((b) => byId.get(b.articleId))
    .filter(Boolean);
  const history = (await historyForUser(session.userId, 30))
    .map((id) => byId.get(id))
    .filter(Boolean);

  return ok({ saved, history });
});

export const POST = route(async (req: NextRequest) => {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));
  const parsed = bookmarkSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  const { articleId, action } = parsed.data;
  if (action === "remove") {
    await removeBookmark(session.userId, articleId);
    return ok({ ok: true, bookmarked: false });
  }
  await addBookmark(session.userId, articleId);
  return ok({ ok: true, bookmarked: true });
});
