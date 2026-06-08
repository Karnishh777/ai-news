import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { loginSchema, fieldErrors } from "@/lib/validation";
import { findUserByEmail, getPasswordHash } from "@/lib/db";
import { createSessionCookie, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ensureSeeded } from "@/lib/seed-memory";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  await ensureSeeded();
  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 10, 60_000).ok)
    return fail("Too many login attempts. Please try again shortly.", 429);

  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);
  const hash = user ? await getPasswordHash(user.id) : undefined;

  // Constant-ish response to avoid leaking which emails exist.
  const valid = hash ? await verifyPassword(password, hash) : false;
  if (!user || !valid) return fail("Invalid email or password", 401);

  await createSessionCookie({ userId: user.id, email: user.email, role: user.role }, user);
  return ok({ ok: true, user, next: user.onboarded ? "/feed" : "/onboarding" });
});
