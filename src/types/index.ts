// ─────────────────────────────────────────────────────────────
// Shared domain types for NewsFlow AI
// ─────────────────────────────────────────────────────────────

export type Language = "en" | "ta" | "hi" | "te" | "ml" | "kn";

export type NewsLength = "headlines" | "short" | "detailed";

export type NotificationPreference = "breaking" | "digest" | "both";

export type CategorySlug =
  | "technology"
  | "ai"
  | "science"
  | "business"
  | "finance"
  | "startups"
  | "cricket"
  | "football"
  | "sports"
  | "movies"
  | "gaming"
  | "politics"
  | "education"
  | "health"
  | "space"
  | "world"
  | "local"
  | "environment"
  | "stock-market"
  | "entrepreneurship";

export interface Category {
  slug: CategorySlug;
  label: string;
  emoji: string;
  /** Tailwind gradient classes used for chips / accents */
  gradient: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "user" | "admin";
  emailVerified: boolean;
  createdAt: string;
  onboarded: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  interests: CategorySlug[];
  language: Language;
  newsLength: NewsLength;
  notification: NotificationPreference;
  location?: string;
}

export interface Source {
  id: string;
  name: string;
  logo?: string;
  /** 0-100 credibility score used in ranking + fact-check badge */
  credibility: number;
}

export type FactCheckStatus = "verified" | "developing" | "opinion" | "unverified";

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: CategorySlug;
  source: Source;
  author?: string;
  imageUrl: string;
  url: string;
  publishedAt: string;
  /** Short AI-generated summary (≈ 40 words) */
  summary: string;
  /** Full article body (markdown-ish paragraphs) */
  content: string;
  /** 3-5 bullet key takeaways */
  takeaways: string[];
  /** "30-second read" condensed version */
  quickRead: string;
  factCheck: FactCheckStatus;
  readingTimeMin: number;
  tags: string[];
  trendingScore: number;
  breaking: boolean;
  language: Language;
}

export type InteractionType =
  | "click"
  | "like"
  | "share"
  | "save"
  | "view"
  | "read_time"
  | "category_open";

export interface Interaction {
  id: string;
  userId: string;
  articleId?: string;
  category?: CategorySlug;
  type: InteractionType;
  /** seconds, for read_time */
  value?: number;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  articleId?: string;
  type: "breaking" | "digest" | "personalized";
  read: boolean;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
