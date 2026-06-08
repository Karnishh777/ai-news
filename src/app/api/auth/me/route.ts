import { route, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed-memory";

export const runtime = "nodejs";

export const GET = route(async () => {
  await ensureSeeded();
  const user = await getCurrentUser();
  return ok({ user });
});
