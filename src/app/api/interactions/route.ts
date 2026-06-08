import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { interactionSchema, fieldErrors } from "@/lib/validation";
import { addInteraction, id } from "@/lib/db";

export const runtime = "nodejs";

// Records a behavioral signal used by the personalization engine. Silently
// no-ops for guests so client tracking code never needs to branch.
export const POST = route(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return ok({ ok: true, tracked: false });

  const body = await req.json().catch(() => ({}));
  const parsed = interactionSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  await addInteraction({
    id: id("int"),
    userId: session.userId,
    createdAt: new Date().toISOString(),
    ...parsed.data,
  });
  return ok({ ok: true, tracked: true });
});
