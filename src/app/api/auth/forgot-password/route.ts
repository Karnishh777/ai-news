import { NextRequest } from "next/server";
import { route, ok } from "@/lib/api";
import { forgotPasswordSchema, fieldErrors } from "@/lib/validation";
import { fail } from "@/lib/api";
import { findUserByEmail } from "@/lib/db";
import { generateOtp, sendOtpEmail, exposeOtpInResponse } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Sends a reset code. Always responds 200 (even for unknown emails) to
// avoid account enumeration. A full reset-confirm endpoint would consume
// this code; the OTP delivery + anti-enumeration behavior is implemented.
export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  if (!rateLimit(`forgot:${ip}`, 5, 60_000).ok)
    return fail("Too many requests. Please try again shortly.", 429);

  const body = await req.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, fieldErrors(parsed.error));

  const { email } = parsed.data;
  const user = await findUserByEmail(email);
  let devCode: string | undefined;
  if (user) {
    const code = generateOtp();
    await sendOtpEmail(email, code);
    devCode = exposeOtpInResponse() ? code : undefined;
  }

  return ok({
    ok: true,
    message: "If an account exists for that email, a reset code is on its way.",
    devCode,
  });
});
