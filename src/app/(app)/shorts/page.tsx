"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Share2, BookOpen, Loader2, ChevronUp } from "lucide-react";
import type { Article } from "@/types";
import { ArticleImage } from "@/components/ArticleImage";
import { ListenButton } from "@/components/ListenButton";
import { FactCheckBadge } from "@/components/ui/badge";
import { getCategory } from "@/lib/news/categories";
import { cn, timeAgo } from "@/lib/utils";
import { track } from "@/lib/track";

export default function ShortsPage() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/news?pageSize=25")
      .then((r) => r.json())
      .then((d) => setItems(d.articles ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Track which short is in view (for the counter + view signal).
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i);
            setIndex(i);
            const a = items[i];
            if (a) track("view", { articleId: a.id, category: a.category });
          }
        }
      },
      { root, threshold: 0.6 },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  const go = useCallback((dir: 1 | -1) => {
    const next = Math.max(0, Math.min(slideRefs.current.length - 1, index + dir));
    slideRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") go(1);
      if (e.key === "ArrowUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const like = (a: Article) => {
    setLiked((s) => {
      const n = new Set(s);
      n.has(a.id) ? n.delete(a.id) : (n.add(a.id), track("like", { articleId: a.id, category: a.category }));
      return n;
    });
  };
  const save = (a: Article) => {
    setSaved((s) => {
      const n = new Set(s);
      const adding = !n.has(a.id);
      adding ? n.add(a.id) : n.delete(a.id);
      track("save", { articleId: a.id, category: a.category });
      fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId: a.id, action: adding ? "add" : "remove" }),
      }).catch(() => {});
      return n;
    });
  };
  const share = (a: Article) => {
    track("share", { articleId: a.id, category: a.category });
    const url = `${location.origin}/article/${a.id}`;
    if (navigator.share) navigator.share({ title: a.title, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
  };

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">⚡ Shorts</h1>
        <span className="text-sm text-muted-foreground">
          {index + 1} / {items.length} · swipe ↑↓
        </span>
      </div>

      <div
        ref={containerRef}
        className="no-scrollbar h-[calc(100dvh-11rem)] snap-y snap-mandatory overflow-y-scroll rounded-3xl"
      >
        {items.map((a, i) => {
          const cat = getCategory(a.category);
          return (
            <section
              key={a.id}
              data-i={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="relative h-full w-full snap-start snap-always overflow-hidden rounded-3xl border border-border"
            >
              <ArticleImage
                src={a.imageUrl}
                category={a.category}
                alt={a.title}
                sizes="(max-width:1024px) 100vw, 800px"
                className="object-cover"
                emojiClass="text-[8rem]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />

              {/* Right-rail actions (reels style) */}
              <div className="absolute bottom-32 right-4 z-10 flex flex-col items-center gap-4 text-white">
                <ActionBtn onClick={() => like(a)} active={liked.has(a.id)} icon={<Heart className={cn("size-6", liked.has(a.id) && "fill-rose-500 text-rose-500")} />} />
                <ActionBtn onClick={() => save(a)} active={saved.has(a.id)} icon={<Bookmark className={cn("size-6", saved.has(a.id) && "fill-white")} />} />
                <ActionBtn onClick={() => share(a)} icon={<Share2 className="size-6" />} />
                <div className="rounded-full bg-white/15 p-1 backdrop-blur">
                  <ListenButton text={`${a.title}. ${a.summary}`} lang={a.language} label={false} className="text-white hover:bg-white/20" />
                </div>
              </div>

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-6 pr-20 text-white">
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn("rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-semibold", cat.gradient)}>
                    {cat.emoji} {cat.label}
                  </span>
                  {a.breaking && <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold">LIVE</span>}
                  <FactCheckBadge status={a.factCheck} />
                </div>
                <Link href={`/article/${a.id}`} onClick={() => track("click", { articleId: a.id, category: a.category })}>
                  <h2 className="text-balance font-display text-2xl font-bold leading-tight sm:text-3xl">{a.title}</h2>
                </Link>
                <p className="mt-2 line-clamp-4 text-sm text-white/85 sm:text-base">{a.summary}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-white/70">
                    {a.source.name} · {timeAgo(a.publishedAt)}
                  </span>
                  <Link
                    href={`/article/${a.id}`}
                    onClick={() => track("click", { articleId: a.id, category: a.category })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
                  >
                    <BookOpen className="size-4" /> Read full
                  </Link>
                </div>
              </div>

              {i < items.length - 1 && (
                <button
                  onClick={() => go(1)}
                  className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 animate-bounce rounded-full bg-white/15 p-1.5 text-white backdrop-blur"
                  aria-label="Next"
                >
                  <ChevronUp className="size-5 rotate-180" />
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, icon, active }: { onClick: () => void; icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "grid size-12 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25",
        active && "ring-2 ring-white/60",
      )}
    >
      {icon}
    </button>
  );
}
