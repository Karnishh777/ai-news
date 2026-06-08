import type { Article, CategorySlug, FactCheckStatus, Language, Source } from "@/types";
import { CATEGORIES } from "./categories";
import { mulberry32, readingTime, slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// News Provider
//
// The platform reads news through a single `NewsProvider` interface so
// the source can be swapped without touching the app. The default
// `MockNewsProvider` generates realistic, deterministic articles so the
// product runs with zero external keys. `NewsApiProvider` / `RssProvider`
// (below) are the production adapters — enable by setting NEWSAPI_KEY or
// RSS_FEEDS and wiring them in `getNewsProvider()`.
// ─────────────────────────────────────────────────────────────

export interface NewsProvider {
  fetchArticles(): Promise<Article[]>;
}

const SOURCES: Source[] = [
  { id: "src-verge", name: "The Verge", credibility: 88 },
  { id: "src-reuters", name: "Reuters", credibility: 97 },
  { id: "src-bloomberg", name: "Bloomberg", credibility: 93 },
  { id: "src-techcrunch", name: "TechCrunch", credibility: 84 },
  { id: "src-bbc", name: "BBC News", credibility: 95 },
  { id: "src-espn", name: "ESPN", credibility: 86 },
  { id: "src-nature", name: "Nature", credibility: 98 },
  { id: "src-wired", name: "WIRED", credibility: 87 },
  { id: "src-ap", name: "Associated Press", credibility: 96 },
  { id: "src-variety", name: "Variety", credibility: 82 },
];

const FACT_STATES: FactCheckStatus[] = ["verified", "developing", "opinion", "unverified"];

// Headline templates keyed by category for believable variety.
const TEMPLATES: Record<CategorySlug, string[]> = {
  technology: [
    "Apple unveils a foldable {x} that rethinks the laptop",
    "New chip architecture promises {n}x faster on-device compute",
    "Open-source {x} project hits one million developers",
  ],
  ai: [
    "Frontier model passes graduate-level reasoning benchmark",
    "Researchers cut LLM inference cost by {n}% with new caching",
    "AI agents now handle end-to-end {x} workflows autonomously",
  ],
  science: [
    "Scientists observe a never-before-seen state of matter",
    "Breakthrough in fusion sustains plasma for record {n} seconds",
    "Gene-editing trial reverses inherited {x} in early patients",
  ],
  business: [
    "Quarterly earnings beat estimates as {x} demand surges",
    "Mega-merger reshapes the global {x} market",
    "Supply chains stabilize, easing prices across {x}",
  ],
  finance: [
    "Central bank signals shift as inflation cools to {n}%",
    "Bond markets rally on softer rate outlook",
    "Fintech disrupts cross-border payments with instant rails",
  ],
  startups: [
    "Seed-stage {x} startup raises ${n}M to scale globally",
    "Y Combinator batch leans heavily into {x}",
    "Founder-led {x} company reaches profitability in 18 months",
  ],
  cricket: [
    "Last-over thriller decides the series in {x}",
    "Young opener smashes record {n}-ball century",
    "Spin masterclass seals a famous away win",
  ],
  football: [
    "Stoppage-time winner sends {x} top of the table",
    "Record transfer fee agreed for star midfielder",
    "Underdogs stun champions in cup upset",
  ],
  sports: [
    "Olympic qualifier ends in dramatic photo finish",
    "Veteran clinches {n}th career title",
    "New world record falls at the championships",
  ],
  movies: [
    "{x} sequel shatters opening-weekend records",
    "Indie drama sweeps the festival awards",
    "Streaming giant greenlights ambitious {x} universe",
  ],
  gaming: [
    "Highly anticipated {x} launches to critical acclaim",
    "Studio reveals next-gen engine at showcase",
    "Esports final draws record {n} million viewers",
  ],
  politics: [
    "Landmark bill on {x} clears the assembly",
    "Coalition talks intensify ahead of the vote",
    "New policy package targets {x} reform",
  ],
  education: [
    "Universities adopt AI tutors across {n} campuses",
    "National exam results show gains in {x}",
    "New scholarship fund backs first-generation students",
  ],
  health: [
    "Trial shows promising results for {x} treatment",
    "Public-health drive cuts {x} cases by {n}%",
    "Wearables now detect early signs of {x}",
  ],
  space: [
    "Probe sends back stunning images of a distant {x}",
    "Reusable rocket completes its {n}th flight",
    "Astronomers detect water on a rocky exoplanet",
  ],
  world: [
    "Diplomatic breakthrough eases tensions in {x}",
    "Summit ends with pledge on {x}",
    "Historic accord signed after months of talks",
  ],
  local: [
    "City unveils {x} plan to transform the downtown",
    "Local transit gets a ${n}M upgrade",
    "Community rallies to restore the historic {x}",
  ],
  environment: [
    "Renewables overtake coal in the regional grid",
    "Conservation effort brings back the {x} population",
    "New carbon-capture plant goes online",
  ],
  "stock-market": [
    "Indices hit fresh highs as {x} stocks lead gains",
    "Volatility spikes ahead of key earnings week",
    "{x} sector rotation drives record trading volume",
  ],
  entrepreneurship: [
    "Bootstrapped {x} brand crosses ${n}M in revenue",
    "Solo founder builds a profitable {x} in a year",
    "Marketplace empowers {n}k small creators",
  ],
};

const FILLERS = [
  "battery", "vision", "energy", "climate", "mobility", "robotics",
  "cloud", "healthcare", "education", "retail", "logistics", "media",
];

function buildBody(title: string, category: CategorySlug, rng: () => number): string {
  const paras = [
    `${title}. In a development closely watched across the ${category} sector, sources describe a shift that could ripple far beyond its immediate context.`,
    `Analysts say the move reflects a broader trend that has been building over the past several quarters. "This is the kind of change that resets expectations," one observer noted, pointing to early signals that the impact will be durable.`,
    `Supporters argue the benefits are clear: faster outcomes, lower costs, and a more resilient foundation for what comes next. Skeptics counter that execution, not ambition, will decide whether the promise holds.`,
    `What happens next depends on how stakeholders respond in the coming weeks. For now, the story is a reminder of how quickly the landscape can change — and how much remains to be written.`,
  ];
  // Light shuffle for variety.
  if (rng() > 0.5) paras.splice(2, 0, paras.splice(1, 1)[0]);
  return paras.join("\n\n");
}

export class MockNewsProvider implements NewsProvider {
  async fetchArticles(): Promise<Article[]> {
    const articles: Article[] = [];
    const now = Date.now();
    let idx = 0;
    for (const cat of CATEGORIES) {
      const templates = TEMPLATES[cat.slug];
      for (let i = 0; i < 6; i++) {
        const rng = mulberry32(idx * 7919 + i * 104729 + 13);
        const filler = FILLERS[Math.floor(rng() * FILLERS.length)];
        const n = 2 + Math.floor(rng() * 80);
        const title = templates[i % templates.length]
          .replace("{x}", filler)
          .replace("{n}", String(n));
        const source = SOURCES[Math.floor(rng() * SOURCES.length)];
        const ageMin = Math.floor(rng() * 60 * 26); // up to ~26h old
        const publishedAt = new Date(now - ageMin * 60 * 1000).toISOString();
        const content = buildBody(title, cat.slug, rng);
        const trendingScore = Math.round(
          (source.credibility / 100) * 60 + (1 - ageMin / (60 * 26)) * 40 + rng() * 10,
        );
        const breaking = ageMin < 45 && rng() > 0.78;
        const factCheck = breaking
          ? "developing"
          : FACT_STATES[Math.floor(rng() * (source.credibility > 92 ? 1 : FACT_STATES.length))];
        const id = `art-${cat.slug}-${i}`;
        articles.push({
          id,
          title,
          slug: slugify(title) + "-" + i,
          category: cat.slug,
          source,
          author: pickAuthor(rng),
          imageUrl: `https://picsum.photos/seed/${id}/800/500`,
          url: `https://news.example.com/${cat.slug}/${id}`,
          publishedAt,
          summary: makeSummary(title, cat.slug),
          content,
          takeaways: makeTakeaways(title, cat.slug),
          quickRead: `${title}. The key point: this matters for anyone following ${cat.label.toLowerCase()}, and the effects are already being felt.`,
          factCheck,
          readingTimeMin: readingTime(content),
          tags: [cat.slug, filler, source.name.toLowerCase()],
          trendingScore,
          breaking,
          language: "en",
        });
        idx++;
      }
    }
    return articles;
  }
}

function pickAuthor(rng: () => number): string {
  const first = ["Aarav", "Maya", "Liam", "Sofia", "Noah", "Priya", "Ethan", "Zara", "Diego", "Ana"];
  const last = ["Sharma", "Chen", "Patel", "Garcia", "Kim", "Khan", "Silva", "Nguyen", "Okafor", "Rossi"];
  return `${first[Math.floor(rng() * first.length)]} ${last[Math.floor(rng() * last.length)]}`;
}

function makeSummary(title: string, category: CategorySlug): string {
  return `${title}. Here's what's driving the story and why it matters for the ${category} space right now — distilled into a fast, factual read.`;
}

function makeTakeaways(title: string, category: CategorySlug): string[] {
  return [
    `The core development: ${title.toLowerCase()}.`,
    `Why it matters: it could reset expectations across ${category}.`,
    `Who's affected: stakeholders, competitors, and end users alike.`,
    `What's next: watch the response over the coming weeks.`,
  ];
}

// ── Production adapters (wired in via env; not used by default) ──

import { getCategory } from "./categories";

/** NewsAPI.org adapter. Enable by setting NEWSAPI_KEY and using it in getNewsProvider(). */
export class NewsApiProvider implements NewsProvider {
  constructor(private apiKey: string) {}
  async fetchArticles(): Promise<Article[]> {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=100&apiKey=${this.apiKey}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
    const data = (await res.json()) as { articles: RawNewsApiArticle[] };
    return data.articles.map(normalizeNewsApi);
  }
}

interface RawNewsApiArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  author: string | null;
  source: { id: string | null; name: string };
}

function normalizeNewsApi(a: RawNewsApiArticle): Article {
  const content = a.content ?? a.description ?? a.title;
  const category = getCategory("world").slug;
  return {
    id: slugify(a.title).slice(0, 40),
    title: a.title,
    slug: slugify(a.title),
    category,
    source: { id: a.source.id ?? slugify(a.source.name), name: a.source.name, credibility: 85 },
    author: a.author ?? undefined,
    imageUrl: a.urlToImage ?? `https://picsum.photos/seed/${slugify(a.title)}/800/500`,
    url: a.url,
    publishedAt: a.publishedAt,
    summary: a.description ?? a.title,
    content,
    takeaways: makeTakeaways(a.title, category),
    quickRead: a.description ?? a.title,
    factCheck: "unverified",
    readingTimeMin: readingTime(content),
    tags: [],
    trendingScore: 50,
    breaking: false,
    language: "en",
  };
}

// Per-language in-process cache (refreshes every 10 minutes).
const cache = new Map<Language, { at: number; data: Article[] }>();

export const NEWS_TTL_MS = 10 * 60 * 1000;

// Shared article pool in Redis (when configured) so that, on serverless, an
// article fetched by one instance can be resolved (detail page) by another.
import { Redis } from "@upstash/redis";

const POOL_TTL_S = 900; // 15 minutes
const POOL_MAX = 400; // cap stored articles to keep the value small

function redisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return Redis.fromEnv();
    } catch {
      return null;
    }
  }
  return null;
}

const poolKey = (lang: Language) => `nf:pool:${lang}`;

/**
 * Selects the active news source for a language:
 *   - NEWSAPI_KEY set        -> NewsAPI.org
 *   - NEWS_SOURCE === "mock" -> deterministic mock generator (offline-safe)
 *   - default                -> live RSS multi-source aggregation
 */
export async function getNewsProvider(lang: Language = "en"): Promise<NewsProvider> {
  if (process.env.NEWSAPI_KEY) return new NewsApiProvider(process.env.NEWSAPI_KEY);
  if ((process.env.NEWS_SOURCE ?? "rss").toLowerCase() === "mock") return new MockNewsProvider();
  const { RssProvider } = await import("./rss");
  return RssProvider.forLanguage(lang);
}

export async function getAllArticles(lang: Language = "en"): Promise<Article[]> {
  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < NEWS_TTL_MS) return hit.data;

  // Prefer the shared Redis pool (consistent ids across instances).
  const r = redisClient();
  if (r) {
    try {
      const pooled = await r.get<Article[]>(poolKey(lang));
      if (pooled && pooled.length) {
        cache.set(lang, { at: Date.now(), data: pooled });
        return pooled;
      }
    } catch {
      /* fall through to a fresh fetch */
    }
  }

  try {
    const provider = await getNewsProvider(lang);
    const data = await provider.fetchArticles();
    if (data.length === 0) throw new Error("provider returned no articles");
    cache.set(lang, { at: Date.now(), data });
    if (r) {
      try {
        await r.set(poolKey(lang), data.slice(0, POOL_MAX), { ex: POOL_TTL_S });
      } catch {
        /* non-fatal */
      }
    }
    return data;
  } catch (err) {
    console.warn(`[news] live provider failed for "${lang}", falling back to mock:`, err);
    const data = await new MockNewsProvider().fetchArticles();
    cache.set(lang, { at: Date.now() - (NEWS_TTL_MS - 60_000), data });
    return data;
  }
}

/**
 * Merge ad-hoc articles (e.g. live search / local results) into the language's
 * caches so their detail pages resolve afterwards — both in-process and in the
 * shared Redis pool (so any serverless instance can find them).
 */
export async function mergeIntoCache(lang: Language, articles: Article[]): Promise<void> {
  const hit = cache.get(lang);
  const base = hit?.data ?? [];
  const ids = new Set(base.map((a) => a.id));
  const merged = [...articles.filter((a) => !ids.has(a.id)), ...base].slice(0, POOL_MAX);
  cache.set(lang, { at: hit?.at ?? Date.now(), data: merged });

  const r = redisClient();
  if (r) {
    try {
      const pooled = (await r.get<Article[]>(poolKey(lang))) ?? [];
      const pids = new Set(pooled.map((a) => a.id));
      const pmerged = [...articles.filter((a) => !pids.has(a.id)), ...pooled].slice(0, POOL_MAX);
      await r.set(poolKey(lang), pmerged, { ex: POOL_TTL_S });
    } catch {
      /* non-fatal */
    }
  }
}

/** Force the next getAllArticles() call to refetch. */
export function invalidateNewsCache(): void {
  cache.clear();
}
