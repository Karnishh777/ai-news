"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Clock,
  Sparkles,
  ListChecks,
  Type,
  ExternalLink,
} from "lucide-react";
import type { Article } from "@/types";
import { cn, timeAgo } from "@/lib/utils";
import { getCategory } from "@/lib/news/categories";
import { FactCheckBadge } from "@/components/ui/badge";
import { NewsCard } from "@/components/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore, type TextSize } from "@/store/ui";
import { track } from "@/lib/track";

const TEXT_CLASS: Record<TextSize, string> = {
  sm: "text-sm leading-7",
  base: "text-base leading-8",
  lg: "text-lg leading-9",
};

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"quick" | "full">("full");
  const textSize = useUIStore((s) => s.textSize);
  const setTextSize = useUIStore((s) => s.setTextSize);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/news/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setArticle(d.article ?? null);
        setRelated(d.related ?? []);
        if (d.article) track("view", { articleId: d.article.id, category: d.article.category });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Record dwell time on leave for personalization.
  useEffect(() => {
    startedAt.current = Date.now();
    return () => {
      if (!article) return;
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (seconds > 2)
        track("read_time", { articleId: article.id, category: article.category, value: seconds });
    };
  }, [article]);

  const onSave = async () => {
    const next = !saved;
    setSaved(next);
    if (!article) return;
    track("save", { articleId: article.id, category: article.category });
    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ articleId: article.id, action: next ? "add" : "remove" }),
    }).catch(() => {});
  };

  const onShare = () => {
    if (!article) return;
    track("share", { articleId: article.id, category: article.category });
    const url = `${location.origin}/article/${article.id}`;
    if (navigator.share) navigator.share({ title: article.title, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
  };

  if (loading) return <ArticleSkeleton />;
  if (!article)
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-muted-foreground">This article could not be found.</p>
        <Link href="/feed" className="mt-4 inline-block text-primary hover:underline">
          Back to feed
        </Link>
      </div>
    );

  const cat = getCategory(article.category);

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to feed
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full bg-gradient-to-r ${cat.gradient} px-3 py-1 text-xs font-semibold text-white`}>
          {cat.emoji} {cat.label}
        </span>
        <FactCheckBadge status={article.factCheck} />
        {article.breaking && (
          <span className="animate-pulse-ring rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            LIVE
          </span>
        )}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl"
      >
        {article.title}
      </motion.h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{article.source.name}</span>
        {article.author && <span>By {article.author}</span>}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {timeAgo(article.publishedAt)}
        </span>
        <span>{article.readingTimeMin} min read</span>
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
              saved && "text-primary",
            )}
          >
            <Bookmark className={cn("size-4", saved && "fill-primary")} /> Save
          </button>
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Share2 className="size-4" /> Share
          </button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ExternalLink className="size-4" /> Source
          </a>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Type className="ml-1 size-3.5 text-muted-foreground" />
          {(["sm", "base", "lg"] as TextSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setTextSize(s)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                textSize === s ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              {s === "sm" ? "A-" : s === "base" ? "A" : "A+"}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
        <Image src={article.imageUrl} alt={article.title} fill sizes="(max-width:768px) 100vw, 768px" className="object-cover" priority />
      </div>

      {/* AI Summary */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-accent/50 p-5">
        <div className="flex items-center gap-2 font-display font-semibold text-accent-foreground">
          <Sparkles className="size-4" /> AI Summary
        </div>
        <p className="mt-2 text-sm leading-relaxed">{article.summary}</p>
      </div>

      {/* Key takeaways */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 font-display font-semibold">
          <ListChecks className="size-4 text-primary" /> Key takeaways
        </div>
        <ul className="mt-3 space-y-2">
          {article.takeaways.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Read mode tabs */}
      <div className="mt-6 flex gap-2">
        <ModeTab active={mode === "quick"} onClick={() => setMode("quick")} label="⚡ 30-sec read" />
        <ModeTab active={mode === "full"} onClick={() => setMode("full")} label="📖 Full article" />
      </div>

      <div className={cn("mt-4 max-w-none text-foreground/90", TEXT_CLASS[textSize])}>
        {mode === "quick" ? (
          <p>{article.quickRead}</p>
        ) : (
          article.content.split("\n\n").map((p, i) => (
            <p key={i} className="mb-5">
              {p}
            </p>
          ))
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold">Related stories</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((a, i) => (
              <NewsCard key={a.id} article={a} index={i} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
        active ? "gradient-primary text-white shadow-card" : "border border-border bg-card hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="aspect-[16/9] w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
