"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, Clock } from "lucide-react";
import type { Article } from "@/types";
import { timeAgo } from "@/lib/utils";
import { getCategory } from "@/lib/news/categories";
import { track } from "@/lib/track";

export function TrendingRail({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="size-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Trending now</h2>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {articles.map((a, i) => {
          const cat = getCategory(a.category);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
              className="w-72 shrink-0 snap-start"
            >
              <Link
                href={`/article/${a.id}`}
                onClick={() => track("click", { articleId: a.id, category: a.category })}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl shadow-card"
              >
                <Image
                  src={a.imageUrl}
                  alt={a.title}
                  fill
                  sizes="288px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute left-3 top-3 grid size-7 place-items-center rounded-full bg-white/20 text-sm font-bold text-white backdrop-blur">
                  {i + 1}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <span className={`inline-block rounded-full bg-gradient-to-r ${cat.gradient} px-2 py-0.5 text-xs font-semibold`}>
                    {cat.emoji} {cat.label}
                  </span>
                  <h3 className="mt-2 line-clamp-3 font-display text-lg font-semibold leading-snug">
                    {a.title}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-xs text-white/80">
                    {a.source.name}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" /> {timeAgo(a.publishedAt)}
                    </span>
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
