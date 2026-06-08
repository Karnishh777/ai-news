"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, RefreshCw } from "lucide-react";
import type { Article, CategorySlug } from "@/types";
import { NewsCard } from "@/components/NewsCard";
import { TrendingRail } from "@/components/TrendingRail";
import { CategoryChips } from "@/components/CategoryChips";
import { NewsCardSkeleton } from "@/components/ui/skeleton";
import { getCategory } from "@/lib/news/categories";
import { timeAgo } from "@/lib/utils";
import { useUserStore } from "@/store/user";

// News auto-refreshes on this cadence (matches the server cache window).
const REFRESH_MS = 10 * 60 * 1000;

interface Section {
  category: CategorySlug;
  articles: Article[];
}

export default function FeedPage() {
  const user = useUserStore((s) => s.user);
  const [active, setActive] = useState<CategorySlug | "all">("all");
  const [trending, setTrending] = useState<Article[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [feed, setFeed] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // Trending rail + category rails
  const loadTop = useCallback(async () => {
    const [t, g] = await Promise.all([
      fetch("/api/news/trending").then((r) => r.json()).catch(() => ({})),
      fetch("/api/news?grouped=1").then((r) => r.json()).catch(() => ({})),
    ]);
    setTrending(t.articles ?? []);
    setSections(g.sections ?? []);
  }, []);

  // Page-1 of the current category. `silent` keeps the existing cards on
  // screen during background refreshes instead of flashing skeletons.
  const loadFeed = useCallback(
    async (silent = false) => {
      if (!silent) {
        setInitialLoading(true);
        setFeed([]);
      }
      const qs = new URLSearchParams({ page: "1", pageSize: "18" });
      if (active !== "all") qs.set("category", active);
      try {
        const d = await fetch(`/api/news?${qs}`).then((r) => r.json());
        setFeed(d.articles ?? []);
        setHasMore(Boolean(d.hasMore));
        setPage(2);
        setLastUpdated(Date.now());
      } catch {
        /* keep whatever is on screen */
      } finally {
        setInitialLoading(false);
      }
    },
    [active],
  );

  // Reload when the category changes (and on first mount).
  useEffect(() => {
    loadTop();
    loadFeed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Manual + automatic refresh
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTop(), loadFeed(true)]);
    setRefreshing(false);
  }, [loadTop, loadFeed]);

  // Auto-refresh every 10 minutes, and when the tab is refocused after a gap.
  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastUpdated > REFRESH_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, lastUpdated]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || initialLoading) return;
    setLoadingMore(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: "18" });
    if (active !== "all") qs.set("category", active);
    try {
      const d = await fetch(`/api/news?${qs}`).then((r) => r.json());
      setFeed((prev) => [...prev, ...(d.articles ?? [])]);
      setHasMore(Boolean(d.hasMore));
      setPage((p) => p + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [active, page, hasMore, loadingMore, initialLoading]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {greeting()}{user ? `, ${user.fullName.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s what&apos;s happening, tuned to you.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          title="Auto-updates every 10 minutes"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Updated {timeAgo(new Date(lastUpdated))}</span>
        </button>
      </div>

      <TrendingRail articles={trending} />

      <div className="sticky top-16 z-30 -mx-4 bg-background/80 px-4 py-2 backdrop-blur">
        <CategoryChips active={active} onChange={setActive} />
      </div>

      {/* Main feed */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">
          {active === "all" ? "✨ For You" : `${getCategory(active).emoji} ${getCategory(active).label}`}
        </h2>
        {initialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            No stories here yet. Check back soon.
          </p>
        ) : (
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((a, i) => (
              <NewsCard key={a.id} article={a} index={i} variant={i === 0 && active === "all" ? "feature" : "default"} />
            ))}
          </div>
        )}

        <div ref={sentinel} className="h-10" />
        {loadingMore && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {!hasMore && !initialLoading && feed.length > 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up ✨</p>
        )}
      </section>

      {/* Category rails (only on the For You view) */}
      {active === "all" &&
        sections.slice(0, 6).map((sec) => {
          const cat = getCategory(sec.category);
          return (
            <section key={sec.category}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">
                  {cat.emoji} {cat.label}
                </h2>
                <button
                  onClick={() => setActive(sec.category)}
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  See all <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
                {sec.articles.map((a, i) => (
                  <div key={a.id} className="w-72 shrink-0">
                    <NewsCard article={a} index={i} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
