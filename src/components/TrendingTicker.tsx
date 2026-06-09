"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useAnimationControls } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { Article } from "@/types";
import { getCategory } from "@/lib/news/categories";
import { track } from "@/lib/track";

export function TrendingTicker() {
  const [items, setItems] = useState<Article[]>([]);
  const controls = useAnimationControls();
  const hovering = useRef(false);

  useEffect(() => {
    fetch("/api/news/trending")
      .then((r) => r.json())
      .then((d) => setItems((d.articles ?? []).slice(0, 12)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!items.length) return;
    // Continuous leftward scroll; loops seamlessly because the list is doubled.
    controls.start({
      x: ["0%", "-50%"],
      transition: { duration: Math.max(28, items.length * 4), ease: "linear", repeat: Infinity },
    });
  }, [items, controls]);

  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card/70 px-3 py-2.5 backdrop-blur">
      <span className="z-10 flex shrink-0 items-center gap-1.5 rounded-lg bg-destructive px-2.5 py-1 text-xs font-bold uppercase text-destructive-foreground">
        <TrendingUp className="size-3.5" /> Trending
      </span>
      <div
        className="relative flex-1 overflow-hidden"
        onMouseEnter={() => {
          hovering.current = true;
          controls.stop();
        }}
        onMouseLeave={() => {
          hovering.current = false;
          controls.start({
            x: ["0%", "-50%"],
            transition: { duration: Math.max(28, items.length * 4), ease: "linear", repeat: Infinity },
          });
        }}
      >
        <motion.div animate={controls} className="flex w-max gap-8 whitespace-nowrap">
          {loop.map((a, i) => {
            const cat = getCategory(a.category);
            return (
              <Link
                key={`${a.id}-${i}`}
                href={`/article/${a.id}`}
                onClick={() => track("click", { articleId: a.id, category: a.category })}
                className="group inline-flex items-center gap-2 text-sm"
              >
                <span>{cat.emoji}</span>
                <span className="font-medium text-foreground/80 transition-colors group-hover:text-primary">
                  {a.title}
                </span>
                <span className="text-muted-foreground">•</span>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
