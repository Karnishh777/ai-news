import "server-only";
import { createUser, findUserByEmail, updateUser } from "./db";
import { hashPassword } from "./auth";
import type { CategorySlug } from "@/types";

// Seeds two ready-to-use accounts into the active store (memory or Redis):
//   demo@newsflow.ai  / Demo1234   (regular, onboarded)
//   admin@newsflow.ai / Admin1234  (admin)
//
// Idempotent: it checks for existing accounts before creating, so it's safe
// to call on every cold start. A per-process promise dedupes concurrent calls.

let seeding: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seeding) return seeding;
  seeding = doSeed().catch((err) => {
    // Allow a later retry if seeding failed (e.g. transient Redis error).
    seeding = null;
    throw err;
  });
  return seeding;
}

async function doSeed(): Promise<void> {
  const demoInterests: CategorySlug[] = ["technology", "ai", "science", "business", "space"];

  if (!(await findUserByEmail("demo@newsflow.ai"))) {
    const hash = await hashPassword("Demo1234");
    const u = await createUser({ fullName: "Demo User", email: "demo@newsflow.ai", passwordHash: hash });
    await updateUser(u.id, {
      onboarded: true,
      preferences: {
        interests: demoInterests,
        language: "en",
        newsLength: "short",
        notification: "both",
        location: "San Francisco",
      },
    });
  }

  if (!(await findUserByEmail("admin@newsflow.ai"))) {
    const hash = await hashPassword("Admin1234");
    const a = await createUser({
      fullName: "Platform Admin",
      email: "admin@newsflow.ai",
      passwordHash: hash,
      role: "admin",
    });
    await updateUser(a.id, {
      onboarded: true,
      preferences: {
        interests: ["world", "politics", "finance", "technology"],
        language: "en",
        newsLength: "detailed",
        notification: "both",
      },
    });
  }
}
