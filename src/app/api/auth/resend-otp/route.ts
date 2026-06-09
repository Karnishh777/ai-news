import { NextRequest } from "next/server";
import { route, ok, fail } from "@/lib/api";
import { signOtpTicket, verifyOtpTicket } from "@/lib/jwt";
import { exposeOtpInResponse, generateOtp, hasEmailProvider, sendOtpEmail } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Re-issues a verification code for a pending signup, using the encrypted
// ticket the client already holds (no server state required).
export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  if (!rateLimit(`resend:${ip}`, 4, 60_000).ok)
    return fail("Please wait before requesting another code.", 429);

  const body = (await req.json().catch(() => ({}))) as { ticket?: string };
  const pending = await verifyOtpTicket(body.ticket);
  if (!pending) return fail("Your session expired. Please sign up again.", 410);

  const code = generateOtp();
  const ticket = await signOtpTicket({ ...pending, code });

  try {
    await sendOtpEmail(pending.email, code);
  } catch (err) {
    console.error("[resend] email delivery failed:", err);
    if (hasEmailProvider()) return fail("We couldn't send the email. Please try again shortly.", 502);
  }

  return ok({ ok: true, ticket, devCode: exposeOtpInResponse() ? code : undefined });
});
