import type { Article, CategorySlug, Interaction, UserPreferences } from "@/types";

// ─────────────────────────────────────────────────────────────
// AI Personalization Engine
//
// Builds a per-user category affinity vector from explicit interests and
// implicit behavior (clicks, dwell time, likes, shares, saves), then
// ranks candidate articles by a blended score of:
//   affinity · recency · trending · source credibility − already-seen.
//
// The more a user interacts, the sharper the affinity vector becomes, so
// the feed measurably adapts over a session.
// ─────────────────────────────────────────────────────────────

const INTERACTION_WEIGHTS: Record<Interaction["type"], number> = {
  view: 0.5,
  click: 2,
  category_open: 3,
  like: 4,
  save: 5,
  share: 6,
  read_time: 0, // handled separately (value-based)
};

export interface AffinityVector {
  [category: string]: number;
}

export function buildAffinity(
  prefs: UserPreferences,
  interactions: Interaction[],
): AffinityVector {
  const vec: AffinityVector = {};

  // Explicit interests provide the prior.
  for (const c of prefs.interests) vec[c] = (vec[c] ?? 0) + 6;

  // Implicit signals refine it.
  for (const i of interactions) {
    const cat = i.category;
    if (!cat) continue;
    if (i.type === "read_time") {
      // 30s of reading ≈ 1.5 points, capped so one article can't dominate.
      vec[cat] = (vec[cat] ?? 0) + Math.min(5, (i.value ?? 0) / 20);
    } else {
      vec[cat] = (vec[cat] ?? 0) + INTERACTION_WEIGHTS[i.type];
    }
  }
  return vec;
}

function recencyScore(publishedAt: string): number {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3.6e6;
  // Exponential decay: ~1.0 fresh → ~0.5 at 12h → ~0.25 at 24h.
  return Math.exp(-ageHours / 17);
}

export interface RankOptions {
  prefs: UserPreferences;
  interactions: Interaction[];
  seenArticleIds?: Set<string>;
}

export function rankArticles(articles: Article[], opts: RankOptions): Article[] {
  const affinity = buildAffinity(opts.prefs, opts.interactions);
  const seen = opts.seenArticleIds ?? new Set();
  const lang = opts.prefs.language;

  const scored = articles.map((a) => {
    const aff = affinity[a.category] ?? 0;
    const score =
      aff * 1.6 +
      recencyScore(a.publishedAt) * 22 +
      (a.trendingScore / 100) * 14 +
      (a.source.credibility / 100) * 6 +
      (a.breaking ? 8 : 0) +
      (a.language === lang ? 3 : 0) -
      (seen.has(a.id) ? 18 : 0);
    return { a, score };
  });

  scored.sort((x, y) => y.score - x.score);
  return scored.map((s) => s.a);
}

/** Trending = global engagement, independent of the user. */
export function rankTrending(articles: Article[]): Article[] {
  return [...articles]
    .map((a) => ({
      a,
      score: a.trendingScore * 0.7 + recencyScore(a.publishedAt) * 40 + (a.breaking ? 25 : 0),
    }))
    .sort((x, y) => y.score - x.score)
    .map((s) => s.a);
}

/** Group articles by category for the home "sections" rails. */
export function groupByCategory(
  articles: Article[],
  order: CategorySlug[],
): Record<string, Article[]> {
  const groups: Record<string, Article[]> = {};
  for (const a of articles) (groups[a.category] ??= []).push(a);
  // Preserve requested order; append any remaining categories.
  const ordered: Record<string, Article[]> = {};
  for (const c of order) if (groups[c]) ordered[c] = groups[c];
  for (const c of Object.keys(groups)) if (!ordered[c]) ordered[c] = groups[c];
  return ordered;
}
