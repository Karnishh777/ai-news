import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { signupSchema, fieldErrors } from "@/lib/validation";
import { findUserByEmail } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { signOtpTicket } from "@/lib/jwt";
import { exposeOtpInResponse, generateOtp, hasEmailProvider, sendOtpEmail } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ensureSeeded } from "@/lib/seed-memory";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  await ensureSeeded();
  const ip = clientIp(req);
  if (!rateLimit(`signup:${ip}`, 6, 60_000).ok)
    return fail("Too many attempts. Please try again in a minute.", 429);

  const body = await req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  const { fullName, email, password } = parsed.data;
  if (await findUserByEmail(email))
    return fail("An account with this email already exists", 409);

  const passwordHash = await hashPassword(password);
  const code = generateOtp();

  // Stateless: the pending account + code live in an encrypted ticket the
  // client holds, so verification works across serverless instances with no
  // shared store. (When a persistent driver is configured this still works.)
  const ticket = await signOtpTicket({ fullName, email, passwordHash, code });

  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error("[signup] email delivery failed:", err);
    // If a provider is configured but delivery failed, fail clearly rather
    // than leaving the user without a code.
    if (hasEmailProvider()) return fail("We couldn't send the verification email. Please try again shortly.", 502);
  }

  return ok({
    ok: true,
    message: "We sent a 6-digit code to your email.",
    ticket,
    // demo-mode convenience when no email provider is configured
    devCode: exposeOtpInResponse() ? code : undefined,
  });
});
