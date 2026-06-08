import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { settingsSchema, fieldErrors } from "@/lib/validation";
import { createSessionCookie, getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export const runtime = "nodejs";

// Updates profile + preferences from the Settings page. Persists to the
// active store and reissues the session so changes travel with the token
// (works on stateless serverless too).
export const POST = route(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  const { fullName, ...preferences } = parsed.data;
  const updated = {
    ...user,
    fullName,
    onboarded: true,
    preferences: { ...user.preferences, ...preferences },
  };

  await updateUser(user.id, { fullName, preferences: updated.preferences });
  await createSessionCookie({ userId: updated.id, email: updated.email, role: updated.role }, updated);

  return ok({ ok: true, user: updated });
});
