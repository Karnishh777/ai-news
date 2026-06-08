import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError } from "./auth";
import { fieldErrors } from "./validation";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, details?: Record<string, string[]>) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Wrap a route handler with uniform error handling. */
export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof UnauthorizedError) return fail("Unauthorized", 401);
      if (err instanceof z.ZodError) return fail("Validation failed", 422, fieldErrors(err));
      console.error("[api] unhandled error:", err);
      return fail("Something went wrong", 500);
    }
  };
}
