import type { Article, CategorySlug, FactCheckStatus } from "@/types";
import type { NewsProvider } from "./provider";
import { readingTime, slugify } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// RSS / multi-source aggregation
//
// Fetches real, live news from many public RSS feeds in parallel and
// normalizes them into the app's Article shape. Zero external API keys
// required. Dependency-free RSS 2.0 parser so it deploys cleanly to
// serverless (Netlify/Vercel) without native modules.
//
// BBC feeds are image-rich (media:thumbnail); Google News search feeds
// cover every other topic. Images are sanitized to a host allowlist so
// next/image never errors — anything else falls back to a seeded image.
// ─────────────────────────────────────────────────────────────

interface FeedDef {
  url: string;
  category: CategorySlug;
  source: string;
  credibility: number;
}

const bbc = (path: string) => `https://feeds.bbci.co.uk/${path}/rss.xml`;
const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:2d")}&hl=en-US&gl=US&ceid=US:en`;

// Default aggregation set — covers all 20 categories with live sources.
export const DEFAULT_FEEDS: FeedDef[] = [
  { url: bbc("news/technology"), category: "technology", source: "BBC News", credibility: 95 },
  { url: bbc("news/science_and_environment"), category: "science", source: "BBC News", credibility: 95 },
  { url: bbc("news/science_and_environment"), category: "environment", source: "BBC News", credibility: 95 },
  { url: bbc("news/business"), category: "business", source: "BBC News", credibility: 95 },
  { url: bbc("news/world"), category: "world", source: "BBC News", credibility: 95 },
  { url: bbc("news/health"), category: "health", source: "BBC News", credibility: 95 },
  { url: bbc("news/entertainment_and_arts"), category: "movies", source: "BBC News", credibility: 92 },
  { url: bbc("news/politics"), category: "politics", source: "BBC News", credibility: 93 },
  { url: bbc("sport"), category: "sports", source: "BBC Sport", credibility: 92 },
  { url: gnews("artificial intelligence"), category: "ai", source: "Google News", credibility: 80 },
  { url: gnews("finance markets"), category: "finance", source: "Google News", credibility: 80 },
  { url: gnews("startups venture capital"), category: "startups", source: "Google News", credibility: 80 },
  { url: gnews("entrepreneurship founders"), category: "entrepreneurship", source: "Google News", credibility: 80 },
  { url: gnews("cricket"), category: "cricket", source: "Google News", credibility: 80 },
  { url: gnews("football soccer"), category: "football", source: "Google News", credibility: 80 },
  { url: gnews("video games gaming"), category: "gaming", source: "Google News", credibility: 80 },
  { url: gnews("education students"), category: "education", source: "Google News", credibility: 80 },
  { url: gnews("space exploration NASA"), category: "space", source: "Google News", credibility: 80 },
  { url: gnews("stock market"), category: "stock-market", source: "Google News", credibility: 80 },
  { url: gnews("local community news"), category: "local", source: "Google News", credibility: 78 },
];

const IMAGE_HOST_ALLOWLIST = [
  "ichef.bbci.co.uk",
  "ichef.bbc.co.uk",
  "images.unsplash.com",
  "picsum.photos",
  "i.pravatar.cc",
];

export function feedsFromEnv(): FeedDef[] {
  const raw = process.env.RSS_FEEDS?.trim();
  if (!raw) return DEFAULT_FEEDS;
  // Format: "url|category|source, url|category|source"
  const parsed = raw
    .split(",")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [url, category, source] = row.split("|").map((s) => s.trim());
      return { url, category: (category as CategorySlug) ?? "world", source: source ?? "RSS", credibility: 82 };
    })
    .filter((f) => f.url);
  return parsed.length ? parsed : DEFAULT_FEEDS;
}

export class RssProvider implements NewsProvider {
  constructor(private feeds: FeedDef[] = feedsFromEnv()) {}

  async fetchArticles(): Promise<Article[]> {
    const results = await Promise.allSettled(this.feeds.map((f) => this.fetchFeed(f)));
    const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    // De-duplicate by id (same story can appear across feeds).
    const seen = new Set<string>();
    const unique = all.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
    if (unique.length === 0) throw new Error("RSS: all feeds failed or empty");
    return unique;
  }

  private async fetchFeed(feed: FeedDef): Promise<Article[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: { "user-agent": "NewsFlowAI/1.0 (+https://newsflow.ai)" },
        // Revalidate at the edge every 10 minutes.
        next: { revalidate: 600 },
      });
      if (!res.ok) throw new Error(`${feed.url} -> ${res.status}`);
      const xml = await res.text();
      return parseRssItems(xml)
        .slice(0, 12)
        .map((item, idx) => toArticle(item, feed, idx));
    } finally {
      clearTimeout(timeout);
    }
  }
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
      /* fall through to seeded image */
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
  // Google News titles look like "Headline - Source"; split off the source.
  let title = item.title;
  let source = item.source ?? feed.source;
  const dash = title.lastIndexOf(" - ");
  if (dash > 30 && feed.source === "Google News") {
    source = title.slice(dash + 3).trim() || source;
    title = title.slice(0, dash).trim();
  }

  const id = `${feed.category}-${hash(item.link || title)}`;
  const summaryText = clean(item.description) || title;
  const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
  const ageMin = (Date.now() - new Date(publishedAt).getTime()) / 60000;
  const breaking = ageMin < 120 && idx < 2;
  const factCheck: FactCheckStatus = breaking
    ? "developing"
    : feed.credibility >= 90
      ? "verified"
      : "unverified";

  const summary = summaryText.length > 220 ? summaryText.slice(0, 217).trimEnd() + "…" : summaryText;
  const content =
    `${summaryText}\n\nThis story is aggregated from ${source}. Open the original report for the full article and live updates.`;

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
    trendingScore: Math.max(20, Math.round(95 - idx * 5 - Math.min(40, ageMin / 30))),
    breaking,
    language: "en",
  };
}

function makeTakeaways(summary: string, title: string): string[] {
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)
    .slice(0, 4);
  if (sentences.length >= 2) return sentences;
  return [
    title,
    "Read the full report at the source for complete details.",
    "Part of NewsFlow AI's live, aggregated coverage.",
  ];
}
