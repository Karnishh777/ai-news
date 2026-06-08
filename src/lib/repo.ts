import type { AppNotification, Bookmark, Interaction, User } from "@/types";

// ─────────────────────────────────────────────────────────────
// Data repository
//
// A single async interface with two interchangeable drivers:
//   • MemoryRepo  — zero-setup default (HMR-safe, per-process)
//   • RedisRepo   — durable, serverless-safe (Upstash Redis over HTTPS)
//
// The driver is chosen at runtime: if UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set, Redis is used; otherwise memory.
// Call sites only ever use the async facade in `db.ts`.
// ─────────────────────────────────────────────────────────────

export interface CreateUserParams {
  fullName: string;
  email: string;
  passwordHash: string;
  role?: "user" | "admin";
}

export interface Repo {
  // users
  findUserByEmail(email: string): Promise<User | undefined>;
  findUserById(userId: string): Promise<User | undefined>;
  getPasswordHash(userId: string): Promise<string | undefined>;
  createUser(params: CreateUserParams): Promise<User>;
  updateUser(userId: string, patch: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  // interactions / history
  addInteraction(i: Interaction): Promise<void>;
  interactionsForUser(userId: string): Promise<Interaction[]>;
  historyForUser(userId: string, limit?: number): Promise<string[]>;
  // bookmarks
  addBookmark(userId: string, articleId: string): Promise<void>;
  removeBookmark(userId: string, articleId: string): Promise<void>;
  bookmarksForUser(userId: string): Promise<Bookmark[]>;
  // notifications
  addNotification(n: AppNotification): Promise<void>;
  notificationsForUser(userId: string): Promise<AppNotification[]>;
  markNotificationsRead(userId: string): Promise<void>;
  // analytics
  getInteractionCountsByType(): Promise<Record<string, number>>;
  getTotals(): Promise<{ interactions: number; bookmarks: number }>;
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function newUser(params: CreateUserParams): User {
  return {
    id: genId("usr"),
    fullName: params.fullName,
    email: params.email.toLowerCase(),
    role: params.role ?? "user",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    onboarded: false,
    preferences: { interests: [], language: "en", newsLength: "short", notification: "both" },
  };
}

function mergeUser(u: User, patch: Partial<User>): User {
  return { ...u, ...patch, preferences: { ...u.preferences, ...patch.preferences } };
}

// ─────────────────────────────────────────────────────────────
// Memory driver
// ─────────────────────────────────────────────────────────────

interface MemStore {
  users: Map<string, User>;
  emailIndex: Map<string, string>;
  passwords: Map<string, string>;
  interactions: Interaction[];
  bookmarks: Bookmark[];
  notifications: AppNotification[];
  history: { userId: string; articleId: string; at: number }[];
}

const g = globalThis as unknown as { __nfStore?: MemStore };
const mem: MemStore =
  g.__nfStore ??
  (g.__nfStore = {
    users: new Map(),
    emailIndex: new Map(),
    passwords: new Map(),
    interactions: [],
    bookmarks: [],
    notifications: [],
    history: [],
  });

class MemoryRepo implements Repo {
  async findUserByEmail(email: string) {
    const uid = mem.emailIndex.get(email.toLowerCase());
    return uid ? mem.users.get(uid) : undefined;
  }
  async findUserById(userId: string) {
    return mem.users.get(userId);
  }
  async getPasswordHash(userId: string) {
    return mem.passwords.get(userId);
  }
  async createUser(params: CreateUserParams) {
    const user = newUser(params);
    mem.users.set(user.id, user);
    mem.emailIndex.set(user.email, user.id);
    mem.passwords.set(user.id, params.passwordHash);
    return user;
  }
  async updateUser(userId: string, patch: Partial<User>) {
    const u = mem.users.get(userId);
    if (!u) return undefined;
    const next = mergeUser(u, patch);
    mem.users.set(userId, next);
    return next;
  }
  async getAllUsers() {
    return [...mem.users.values()];
  }
  async addInteraction(i: Interaction) {
    mem.interactions.push(i);
    if (i.type === "view" && i.articleId) {
      mem.history.unshift({ userId: i.userId, articleId: i.articleId, at: Date.now() });
      mem.history = mem.history.slice(0, 2000);
    }
  }
  async interactionsForUser(userId: string) {
    return mem.interactions.filter((i) => i.userId === userId);
  }
  async historyForUser(userId: string, limit = 50) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const h of mem.history) {
      if (h.userId !== userId || seen.has(h.articleId)) continue;
      seen.add(h.articleId);
      out.push(h.articleId);
      if (out.length >= limit) break;
    }
    return out;
  }
  async addBookmark(userId: string, articleId: string) {
    if (mem.bookmarks.some((b) => b.userId === userId && b.articleId === articleId)) return;
    mem.bookmarks.push({ id: genId("bmk"), userId, articleId, createdAt: new Date().toISOString() });
  }
  async removeBookmark(userId: string, articleId: string) {
    mem.bookmarks = mem.bookmarks.filter((b) => !(b.userId === userId && b.articleId === articleId));
  }
  async bookmarksForUser(userId: string) {
    return mem.bookmarks
      .filter((b) => b.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  async addNotification(n: AppNotification) {
    mem.notifications.unshift(n);
  }
  async notificationsForUser(userId: string) {
    return mem.notifications.filter((n) => n.userId === userId);
  }
  async markNotificationsRead(userId: string) {
    for (const n of mem.notifications) if (n.userId === userId) n.read = true;
  }
  async getInteractionCountsByType() {
    const out: Record<string, number> = {};
    for (const i of mem.interactions) out[i.type] = (out[i.type] ?? 0) + 1;
    return out;
  }
  async getTotals() {
    return { interactions: mem.interactions.length, bookmarks: mem.bookmarks.length };
  }
}

// ─────────────────────────────────────────────────────────────
// Redis driver (Upstash)
// ─────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

const K = {
  users: "nf:users",
  user: (id: string) => `nf:user:${id}`,
  email: (e: string) => `nf:email:${e.toLowerCase()}`,
  pwd: (id: string) => `nf:pwd:${id}`,
  int: (uid: string) => `nf:int:${uid}`,
  hist: (uid: string) => `nf:hist:${uid}`,
  bm: (uid: string) => `nf:bm:${uid}`,
  ntf: (uid: string) => `nf:ntf:${uid}`,
  ntfRead: (uid: string) => `nf:ntfread:${uid}`,
  statInt: "nf:stat:int",
  statCounts: "nf:stat:counts",
};

function parseMaybe<T>(v: unknown): T {
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as T;
    }
  }
  return v as T;
}

class RedisRepo implements Repo {
  private r: Redis;
  constructor() {
    this.r = Redis.fromEnv();
  }
  async findUserByEmail(email: string) {
    const uid = await this.r.get<string>(K.email(email));
    return uid ? this.findUserById(uid) : undefined;
  }
  async findUserById(userId: string) {
    return (await this.r.get<User>(K.user(userId))) ?? undefined;
  }
  async getPasswordHash(userId: string) {
    return (await this.r.get<string>(K.pwd(userId))) ?? undefined;
  }
  async createUser(params: CreateUserParams) {
    const user = newUser(params);
    await Promise.all([
      this.r.set(K.user(user.id), user),
      this.r.set(K.email(user.email), user.id),
      this.r.set(K.pwd(user.id), params.passwordHash),
      this.r.sadd(K.users, user.id),
    ]);
    return user;
  }
  async updateUser(userId: string, patch: Partial<User>) {
    const u = await this.findUserById(userId);
    if (!u) return undefined;
    const next = mergeUser(u, patch);
    await this.r.set(K.user(userId), next);
    return next;
  }
  async getAllUsers() {
    const ids = await this.r.smembers(K.users);
    if (!ids.length) return [];
    const rows = await this.r.mget<User[]>(...ids.map((id) => K.user(id)));
    return rows.filter(Boolean) as User[];
  }
  async addInteraction(i: Interaction) {
    const ops: Promise<unknown>[] = [
      this.r.lpush(K.int(i.userId), JSON.stringify(i)),
      this.r.ltrim(K.int(i.userId), 0, 499),
      this.r.hincrby(K.statInt, i.type, 1),
      this.r.hincrby(K.statCounts, "interactions", 1),
    ];
    if (i.type === "view" && i.articleId) {
      ops.push(this.r.lpush(K.hist(i.userId), i.articleId), this.r.ltrim(K.hist(i.userId), 0, 199));
    }
    await Promise.all(ops);
  }
  async interactionsForUser(userId: string) {
    const raw = await this.r.lrange(K.int(userId), 0, -1);
    return raw.map((x) => parseMaybe<Interaction>(x));
  }
  async historyForUser(userId: string, limit = 50) {
    const raw = await this.r.lrange(K.hist(userId), 0, limit * 4);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of raw) {
      const id = String(x);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= limit) break;
    }
    return out;
  }
  async addBookmark(userId: string, articleId: string) {
    const added = await this.r.zadd(K.bm(userId), { score: Date.now(), member: articleId });
    if (added) await this.r.hincrby(K.statCounts, "bookmarks", 1);
  }
  async removeBookmark(userId: string, articleId: string) {
    const removed = await this.r.zrem(K.bm(userId), articleId);
    if (removed) await this.r.hincrby(K.statCounts, "bookmarks", -1);
  }
  async bookmarksForUser(userId: string) {
    const rows = (await this.r.zrange(K.bm(userId), 0, -1, { rev: true, withScores: true })) as (
      | string
      | number
    )[];
    const out: Bookmark[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const articleId = String(rows[i]);
      const score = Number(rows[i + 1]);
      out.push({ id: genId("bmk"), userId, articleId, createdAt: new Date(score).toISOString() });
    }
    return out;
  }
  async addNotification(n: AppNotification) {
    await this.r.lpush(K.ntf(n.userId), JSON.stringify(n));
    await this.r.ltrim(K.ntf(n.userId), 0, 49);
  }
  async notificationsForUser(userId: string) {
    const [raw, readTs] = await Promise.all([
      this.r.lrange(K.ntf(userId), 0, -1),
      this.r.get<number>(K.ntfRead(userId)),
    ]);
    const cutoff = readTs ?? 0;
    return raw.map((x) => {
      const n = parseMaybe<AppNotification>(x);
      return { ...n, read: new Date(n.createdAt).getTime() <= cutoff };
    });
  }
  async markNotificationsRead(userId: string) {
    await this.r.set(K.ntfRead(userId), Date.now());
  }
  async getInteractionCountsByType() {
    const h = (await this.r.hgetall<Record<string, string | number>>(K.statInt)) ?? {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(h)) out[k] = Number(v);
    return out;
  }
  async getTotals() {
    const h = (await this.r.hgetall<Record<string, string | number>>(K.statCounts)) ?? {};
    return { interactions: Number(h.interactions ?? 0), bookmarks: Number(h.bookmarks ?? 0) };
  }
}

// ─────────────────────────────────────────────────────────────
// Driver selection
// ─────────────────────────────────────────────────────────────

const gr = globalThis as unknown as { __nfRepo?: Repo; __nfRepoKind?: string };

export function repoKind(): "redis" | "memory" {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? "redis"
    : "memory";
}

export function getRepo(): Repo {
  const kind = repoKind();
  if (gr.__nfRepo && gr.__nfRepoKind === kind) return gr.__nfRepo;
  gr.__nfRepo = kind === "redis" ? new RedisRepo() : new MemoryRepo();
  gr.__nfRepoKind = kind;
  return gr.__nfRepo;
}
