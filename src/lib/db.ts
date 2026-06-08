import type { AppNotification, Bookmark, Interaction, User } from "@/types";
import { getRepo, genId, repoKind, type CreateUserParams } from "./repo";

// ─────────────────────────────────────────────────────────────
// Async data-access facade
//
// Delegates to the active driver (Upstash Redis when configured, else the
// in-memory store). Every function is async; call sites `await` them. This
// is the seam the rest of the app talks to.
// ─────────────────────────────────────────────────────────────

export { repoKind };

export function id(prefix: string): string {
  return genId(prefix);
}

// ── Users ──
export const findUserByEmail = (email: string): Promise<User | undefined> =>
  getRepo().findUserByEmail(email);

export const findUserById = (userId: string): Promise<User | undefined> =>
  getRepo().findUserById(userId);

export const getPasswordHash = (userId: string): Promise<string | undefined> =>
  getRepo().getPasswordHash(userId);

export const createUser = (params: CreateUserParams): Promise<User> =>
  getRepo().createUser(params);

export const updateUser = (userId: string, patch: Partial<User>): Promise<User | undefined> =>
  getRepo().updateUser(userId, patch);

export const getAllUsers = (): Promise<User[]> => getRepo().getAllUsers();

// ── Interactions / history ──
export const addInteraction = (i: Interaction): Promise<void> => getRepo().addInteraction(i);

export const interactionsForUser = (userId: string): Promise<Interaction[]> =>
  getRepo().interactionsForUser(userId);

export const historyForUser = (userId: string, limit?: number): Promise<string[]> =>
  getRepo().historyForUser(userId, limit);

// ── Bookmarks ──
export const addBookmark = (userId: string, articleId: string): Promise<void> =>
  getRepo().addBookmark(userId, articleId);

export const removeBookmark = (userId: string, articleId: string): Promise<void> =>
  getRepo().removeBookmark(userId, articleId);

export const bookmarksForUser = (userId: string): Promise<Bookmark[]> =>
  getRepo().bookmarksForUser(userId);

// ── Notifications ──
export const addNotification = (n: AppNotification): Promise<void> =>
  getRepo().addNotification(n);

export const notificationsForUser = (userId: string): Promise<AppNotification[]> =>
  getRepo().notificationsForUser(userId);

export const markNotificationsRead = (userId: string): Promise<void> =>
  getRepo().markNotificationsRead(userId);

// ── Analytics (admin) ──
export const getInteractionCountsByType = (): Promise<Record<string, number>> =>
  getRepo().getInteractionCountsByType();

export const getTotals = (): Promise<{ interactions: number; bookmarks: number }> =>
  getRepo().getTotals();
