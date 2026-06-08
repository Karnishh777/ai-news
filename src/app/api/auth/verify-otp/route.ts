import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { createSessionCookie } from "@/lib/auth";
import { verifyOtpTicket } from "@/lib/jwt";
import { createUser, findUserByEmail } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  if (!rateLimit(`verify:${ip}`, 12, 60_000).ok)
    return fail("Too many attempts. Please wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { ticket?: string; code?: string };
  const code = String(body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code", 422);

  const ticket = await verifyOtpTicket(body.ticket);
  if (!ticket) return fail("Your code has expired. Please sign up again.", 410);

  if (ticket.code !== code) return fail("Incorrect code. Please try again.", 401);

  // Finalize the account. Reuse an existing record on the same instance,
  // otherwise create one; either way the profile is embedded in the session.
  const user =
    (await findUserByEmail(ticket.email)) ??
    (await createUser({
      fullName: ticket.fullName,
      email: ticket.email,
      passwordHash: ticket.passwordHash,
    }));

  await createSessionCookie({ userId: user.id, email: user.email, role: user.role }, user);
  return ok({ ok: true, user, next: "/onboarding" });
});
