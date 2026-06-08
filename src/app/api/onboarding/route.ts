import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { onboardingSchema, fieldErrors } from "@/lib/validation";
import { createSessionCookie, getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  const updated = { ...user, onboarded: true, preferences: parsed.data };

  // Persist to the store when present (same instance / persistent driver)…
  await updateUser(user.id, { onboarded: true, preferences: parsed.data });
  // …and reissue the session so the new prefs travel with the token (stateless).
  await createSessionCookie({ userId: updated.id, email: updated.email, role: updated.role }, updated);

  return ok({ ok: true, user: updated, next: "/feed" });
});
