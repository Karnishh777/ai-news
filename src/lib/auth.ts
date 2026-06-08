import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Session, User } from "@/types";
import { findUserById } from "./db";
import {
  MAX_AGE_SECONDS,
  SESSION_COOKIE,
  getUserFromToken,
  signSession,
  verifySession,
} from "./jwt";

const BCRYPT_ROUNDS = 11;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(session: Session, user?: User): Promise<void> {
  const token = await signSession(session, user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Resolve the full current user. Reads the profile embedded in the session
 * token first (works on stateless/serverless), then falls back to the store
 * (e.g. for fresher data when a persistent driver is configured).
 */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  // Token carries the latest profile (reissued on every change) → authoritative.
  const fromToken = await getUserFromToken(token);
  if (fromToken) return fromToken;
  // Legacy tokens without an embedded profile: look up the store.
  const session = await verifySession(token);
  return session ? (await findUserById(session.userId)) ?? null : null;
}

/** For API routes: returns the session or throws a 401-able marker. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
