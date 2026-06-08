import { SignJWT, jwtVerify, EncryptJWT, jwtDecrypt } from "jose";
import type { Session, User } from "@/types";

// Edge-safe token helpers (jose + Web Crypto only — no Node built-ins).
// Imported by both middleware (edge runtime) and the Node auth module.

const DEV_SECRET = "newsflow-dev-secret-change-me-please-32chars-minimum!!";

export function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET || DEV_SECRET;
  return new TextEncoder().encode(s);
}

// 32-byte key for A256GCM encryption of the OTP ticket, derived from the
// JWT secret with Web Crypto (available in both edge and Node runtimes).
async function getEncKey(): Promise<Uint8Array> {
  const data = new TextEncoder().encode((process.env.JWT_SECRET || DEV_SECRET) + ":enc");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export const SESSION_COOKIE = "newsflow_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Signs the session. The full user profile is embedded under `usr` so the
 * app is stateless — it works across serverless instances with no shared
 * store. The cookie is httpOnly, and `usr` contains no secrets (no password).
 */
export async function signSession(session: Session, user?: User): Promise<string> {
  const claims: Record<string, unknown> = { email: session.email, role: session.role };
  if (user) claims.usr = user;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      email: String(payload.email ?? ""),
      role: (payload.role as "user" | "admin") ?? "user",
    };
  } catch {
    return null;
  }
}

/** Reads the embedded user profile from a session token, if present. */
export async function getUserFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.usr as User | undefined) ?? null;
  } catch {
    return null;
  }
}

// ── Stateless OTP ticket (encrypted; confidential to the server) ──

export interface OtpTicketPayload {
  fullName: string;
  email: string;
  passwordHash: string;
  code: string;
}

/**
 * Encrypts the pending-signup details + code into a short-lived ticket the
 * client holds between "sign up" and "verify". Encrypted (not just signed)
 * so the password hash never leaks to the client. No server state needed.
 */
export async function signOtpTicket(p: OtpTicketPayload): Promise<string> {
  const key = await getEncKey();
  return new EncryptJWT({ ...p })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .encrypt(key);
}

export async function verifyOtpTicket(token: string | undefined): Promise<OtpTicketPayload | null> {
  if (!token) return null;
  try {
    const key = await getEncKey();
    const { payload } = await jwtDecrypt(token, key);
    return {
      fullName: String(payload.fullName ?? ""),
      email: String(payload.email ?? ""),
      passwordHash: String(payload.passwordHash ?? ""),
      code: String(payload.code ?? ""),
    };
  } catch {
    return null;
  }
}

export { MAX_AGE_SECONDS };
