import type { Article, CategorySlug, FactCheckStatus, Language } from "@/types";
import type { NewsProvider } from "./provider";
import { readingTime, slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// RSS / multi-source aggregation (language-aware)
//
// Fetches real, live news from many public RSS feeds in parallel and
// normalizes them into the app's Article shape. No API keys required.
// Dependency-free RSS 2.0 parser so it deploys cleanly to serverless.
//
// • English: BBC (image-rich) + Google News for the rest.
// • Other languages: Google News in that language (hl/gl/ceid), which
//   covers Tamil, Hindi, Telugu, Malayalam and Kannada.
// • `liveSearch()` powers the search bar with real results for any query.
// ─────────────────────────────────────────────────────────────

interface LangCfg {
  hl: string;
  gl: string;
  ceid: string;
}

const LANG: Record<Language, LangCfg> = {
  en: { hl: "en-US", gl: "US", ceid: "US:en" },
  ta: { hl: "ta", gl: "IN", ceid: "IN:ta" },
  hi: { hl: "hi", gl: "IN", ceid: "IN:hi" },
  te: { hl: "te", gl: "IN", ceid: "IN:te" },
  ml: { hl: "ml", gl: "IN", ceid: "IN:ml" },
  kn: { hl: "kn", gl: "IN", ceid: "IN:kn" },
};

interface FeedDef {
  url: string;
  category: CategorySlug;
  source: string;
  credibility: number;
  lang: Language;
}

const bbc = (path: string) => `https://feeds.bbci.co.uk/${path}/rss.xml`;

/** Google News search RSS, scoped to a language and the last 24 hours. */
function gnews(query: string, lang: Language): string {
  const c = LANG[lang] ?? LANG.en;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(
    query + " when:1d",
  )}&hl=${c.hl}&gl=${c.gl}&ceid=${c.ceid}`;
}

const BBC_FEEDS: Omit<FeedDef, "lang">[] = [
  { url: bbc("news/technology"), category: "technology", source: "BBC News", credibility: 95 },
  { url: bbc("news/science_and_environment"), category: "science", source: "BBC News", credibility: 95 },
  { url: bbc("news/science_and_environment"), category: "environment", source: "BBC News", credibility: 95 },
  { url: bbc("news/business"), category: "business", source: "BBC News", credibility: 95 },
  { url: bbc("news/world"), category: "world", source: "BBC News", credibility: 95 },
  { url: bbc("news/health"), category: "health", source: "BBC News", credibility: 95 },
  { url: bbc("news/entertainment_and_arts"), category: "movies", source: "BBC News", credibility: 92 },
  { url: bbc("news/politics"), category: "politics", source: "BBC News", credibility: 93 },
  { url: bbc("sport"), category: "sports", source: "BBC Sport", credibility: 92 },
];

const BBC_CATEGORIES = new Set<CategorySlug>([
  "technology", "science", "environment", "business", "world", "health", "movies", "politics", "sports",
]);

const CATEGORY_QUERY: Record<CategorySlug, string> = {
  technology: "technology",
  ai: "artificial intelligence",
  science: "science research",
  business: "business economy",
  finance: "finance markets",
  startups: "startups venture capital",
  cricket: "cricket",
  football: "football soccer",
  sports: "sports",
  movies: "movies cinema entertainment",
  gaming: "video games gaming",
  politics: "politics",
  education: "education students",
  health: "health medicine",
  space: "space exploration NASA",
  world: "world news",
  local: "local news",
  environment: "environment climate",
  "stock-market": "stock market",
  entrepreneurship: "entrepreneurship founders",
};

export function feedsForLanguage(lang: Language): FeedDef[] {
  const feeds: FeedDef[] = [];
  const entries = Object.entries(CATEGORY_QUERY) as [CategorySlug, string][];

  if (lang === "en") {
    for (const f of BBC_FEEDS) feeds.push({ ...f, lang });
    for (const [cat, q] of entries) {
      if (BBC_CATEGORIES.has(cat)) continue; // BBC already covers these
      feeds.push({ url: gnews(q, "en"), category: cat, source: "Google News", credibility: 80, lang });
    }
  } else {
    for (const [cat, q] of entries) {
      feeds.push({ url: gnews(q, lang), category: cat, source: "Google News", credibility: 80, lang });
    }
  }
  return feeds;
}

export function feedsFromEnv(lang: Language = "en"): FeedDef[] {
  const raw = process.env.RSS_FEEDS?.trim();
  if (!raw) return feedsForLanguage(lang);
  const parsed = raw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((row) => {
      const [url, category, source] = row.split("|").map((s) => s.trim());
      return { url, category: (category as CategorySlug) ?? "world", source: source ?? "RSS", credibility: 82, lang };
    })
    .filter((f) => f.url);
  return parsed.length ? parsed : feedsForLanguage(lang);
}

const IMAGE_HOST_ALLOWLIST = [
  "ichef.bbci.co.uk",
  "ichef.bbc.co.uk",
  "images.unsplash.com",
  "picsum.photos",
  "i.pravatar.cc",
];

export class RssProvider implements NewsProvider {
  constructor(private feeds: FeedDef[]) {}

  static forLanguage(lang: Language): RssProvider {
    return new RssProvider(feedsFromEnv(lang));
  }

  async fetchArticles(): Promise<Article[]> {
    const results = await Promise.allSettled(this.feeds.map((f) => this.fetchFeed(f)));
    const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const deduped = dedupe(all);
    if (deduped.length === 0) throw new Error("RSS: all feeds failed or empty");
    return deduped;
  }

  private async fetchFeed(feed: FeedDef): Promise<Article[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: { "user-agent": "NewsFlowAI/1.0 (+https://newsflow.ai)" },
        next: { revalidate: 600 },
      });
      if (!res.ok) throw new Error(`${feed.url} -> ${res.status}`);
      const xml = await res.text();
      return parseRssItems(xml)
        .slice(0, 14)
        .map((item, idx) => toArticle(item, feed, idx));
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Live search across Google News for any query, in the user's language. */
export async function liveSearch(
  query: string,
  lang: Language = "en",
  category: CategorySlug = "world",
): Promise<Article[]> {
  const url = gnewsSearch(query, lang);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "NewsFlowAI/1.0 (+https://newsflow.ai)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const feed: FeedDef = { url, category, source: "Google News", credibility: 80, lang };
    return dedupe(parseRssItems(xml).slice(0, 30).map((it, i) => toArticle(it, feed, i)));
  } catch {
    return [];
  }
}

// Search variant without the when:1d recency clamp (search should reach back).
function gnewsSearch(query: string, lang: Language): string {
  const c = LANG[lang] ?? LANG.en;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(
    query,
  )}&hl=${c.hl}&gl=${c.gl}&ceid=${c.ceid}`;
}

function dedupe(articles: Article[]): Article[] {
  const seenId = new Set<string>();
  const seenTitle = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    const tkey = a.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 64);
    if (!tkey || seenId.has(a.id) || seenTitle.has(tkey)) continue;
    seenId.add(a.id);
    seenTitle.add(tkey);
    out.push(a);
  }
  return out;
}

// ── Minimal RSS 2.0 parser (CDATA + entity aware) ──

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image: string | null;
  source: string | null;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of matches) {
    items.push({
      title: clean(tag(block, "title")),
      link: clean(tag(block, "link")) || extractGuidLink(block),
      description: tag(block, "description"),
      pubDate: clean(tag(block, "pubDate")),
      image: extractImage(block),
      source: clean(tag(block, "source")) || null,
    });
  }
  return items;
}

function tag(xml: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  return xml.match(re)?.[1] ?? "";
}

function attr(xml: string, name: string, attribute: string): string | null {
  const re = new RegExp(`<${name}[^>]*\\b${attribute}="([^"]+)"`, "i");
  return xml.match(re)?.[1] ?? null;
}

function extractImage(block: string): string | null {
  return (
    attr(block, "media:thumbnail", "url") ||
    attr(block, "media:content", "url") ||
    attr(block, "enclosure", "url") ||
    block.match(/<img[^>]+src="([^"]+)"/i)?.[1] ||
    null
  );
}

function extractGuidLink(block: string): string {
  const guid = clean(tag(block, "guid"));
  return /^https?:\/\//.test(guid) ? guid : "";
}

function clean(s: string): string {
  return decodeEntities(stripCdata(s).replace(/<[^>]+>/g, "")).trim();
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ");
}

function safeImage(url: string | null, seed: string): string {
  if (url) {
    try {
      const host = new URL(url).hostname;
      if (IMAGE_HOST_ALLOWLIST.some((h) => host === h || host.endsWith("." + h))) return url;
    } catch {
      /* fall through */
    }
  }
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function toArticle(item: RssItem, feed: FeedDef, idx: number): Article {
  let title = item.title;
  let source = item.source ?? feed.source;
  const dash = title.lastIndexOf(" - ");
  if (dash > 25 && feed.source === "Google News") {
    source = title.slice(dash + 3).trim() || source;
    title = title.slice(0, dash).trim();
  }

  const id = `${feed.category}-${hash(item.link || title)}`;
  const summaryText = clean(item.description) || title;
  const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
  const ageMin = (Date.now() - new Date(publishedAt).getTime()) / 60000;
  const breaking = ageMin < 120 && idx < 2;
  const factCheck: FactCheckStatus = breaking ? "developing" : feed.credibility >= 90 ? "verified" : "unverified";

  const summary = summaryText.length > 240 ? summaryText.slice(0, 237).trimEnd() + "…" : summaryText;
  const content = `${summaryText}\n\nThis story is aggregated from ${source}. Open the original report for the full article and live updates.`;

  return {
    id,
    title,
    slug: slugify(title) || id,
    category: feed.category,
    source: { id: slugify(source), name: source, credibility: feed.credibility },
    imageUrl: safeImage(item.image, id),
    url: item.link,
    publishedAt,
    summary,
    content,
    takeaways: makeTakeaways(summaryText, title),
    quickRead: summary,
    factCheck,
    readingTimeMin: readingTime(content),
    tags: [feed.category, source.toLowerCase()],
    trendingScore: Math.max(20, Math.round(95 - idx * 4 - Math.min(45, ageMin / 30))),
    breaking,
    language: feed.lang,
  };
}

function makeTakeaways(summary: string, title: string): string[] {
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)
    .slice(0, 4);
  if (sentences.length >= 2) return sentences;
  return [title, "Read the full report at the source for complete details.", "Part of NewsFlow AI's live coverage."];
}
