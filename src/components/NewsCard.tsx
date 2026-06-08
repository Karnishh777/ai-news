"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Heart, Share2, Clock } from "lucide-react";
import type { Article } from "@/types";
import { cn, timeAgo } from "@/lib/utils";
import { getCategory } from "@/lib/news/categories";
import { FactCheckBadge } from "@/components/ui/badge";
import { ArticleImage } from "@/components/ArticleImage";
import { track } from "@/lib/track";

interface NewsCardProps {
  article: Article;
  variant?: "default" | "feature" | "compact";
  index?: number;
}

export function NewsCard({ article, variant = "default", index = 0 }: NewsCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const cat = getCategory(article.category);

  const onLike = (e: React.MouseEvent) => {
    e.preventDefault();
    setLiked((v) => !v);
    if (!liked) track("like", { articleId: article.id, category: article.category });
  };

  const onSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    const next = !saved;
    setSaved(next);
    track("save", { articleId: article.id, category: article.category });
    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ articleId: article.id, action: next ? "add" : "remove" }),
    }).catch(() => {});
  };

  const onShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    track("share", { articleId: article.id, category: article.category });
    const url = `${location.origin}/article/${article.id}`;
    if (navigator.share) {
      navigator.share({ title: article.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  const onOpen = () => track("click", { articleId: article.id, category: article.category });

  if (variant === "compact") {
    return (
      <Link
        href={`/article/${article.id}`}
        onClick={onOpen}
        className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-accent/60"
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
          <ArticleImage
            src={article.imageUrl}
            category={article.category}
            alt={article.title}
            sizes="64px"
            className="object-cover"
            emojiClass="text-xl"
          />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
            {article.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {article.source.name} · {timeAgo(article.publishedAt)}
          </p>
        </div>
      </Link>
    );
  }

  const isFeature = variant === "feature";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
        isFeature && "md:col-span-2 md:row-span-2",
      )}
    >
      <Link href={`/article/${article.id}`} onClick={onOpen} className="block">
        <div className={cn("relative overflow-hidden", isFeature ? "aspect-[16/9]" : "aspect-[16/10]")}>
          <ArticleImage
            src={article.imageUrl}
            category={article.category}
            alt={article.title}
            sizes={isFeature ? "(max-width:768px) 100vw, 66vw" : "(max-width:768px) 100vw, 33vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-semibold text-white shadow",
                cat.gradient,
              )}
            >
              {cat.emoji} {cat.label}
            </span>
            {article.breaking && (
              <span className="animate-pulse-ring rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
                LIVE
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
            <span className="font-medium">{article.source.name}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {timeAgo(article.publishedAt)}
            </span>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <h3
            className={cn(
              "text-balance font-display font-semibold leading-snug transition-colors group-hover:text-primary",
              isFeature ? "text-2xl line-clamp-3" : "text-base line-clamp-2",
            )}
          >
            {article.title}
          </h3>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              isFeature ? "line-clamp-3" : "line-clamp-2",
            )}
          >
            {article.summary}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <FactCheckBadge status={article.factCheck} />
        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            onClick={onLike}
            aria-label="Like"
            className="rounded-lg p-2 transition-colors hover:bg-accent hover:text-rose-500"
          >
            <Heart className={cn("size-4", liked && "fill-rose-500 text-rose-500")} />
          </button>
          <button
            onClick={onSave}
            aria-label="Bookmark"
            className="rounded-lg p-2 transition-colors hover:bg-accent hover:text-primary"
          >
            <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
          </button>
          <button
            onClick={onShare}
            aria-label="Share"
            className="rounded-lg p-2 transition-colors hover:bg-accent hover:text-primary"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
