"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import { ArticleImage } from "@/components/ArticleImage";
import type { CategorySlug } from "@/types";

interface BreakingEvent {
  id: string;
  title: string;
  source: string;
  category: string;
  imageUrl: string;
  at: number;
}

// Subscribes to the SSE stream and surfaces breaking news as an animated,
// auto-dismissing toast. New items appear instantly without a page refresh.
export function BreakingNewsToast() {
  const [event, setEvent] = useState<BreakingEvent | null>(null);

  useEffect(() => {
    // SSE works on a long-lived Node server; serverless hosts (Netlify) can't
    // hold the stream, so we cap reconnect attempts to avoid a request storm.
    // The notifications bell + 10-min feed refresh cover real-time there.
    let es: EventSource | null = null;
    let errors = 0;

    const connect = () => {
      es = new EventSource("/api/stream");
      es.addEventListener("breaking", (e) => {
        errors = 0;
        try {
          setEvent(JSON.parse((e as MessageEvent).data));
        } catch {
          /* ignore malformed event */
        }
      });
      es.onerror = () => {
        errors += 1;
        if (errors >= 2) es?.close(); // give up where SSE isn't supported
      };
    };

    connect();
    return () => es?.close();
  }, []);

  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 9000);
    return () => clearTimeout(t);
  }, [event]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6">
      <AnimatePresence>
        {event && (
          <motion.div
            key={event.at}
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-auto w-full max-w-md"
          >
            <Link
              href={`/article/${event.id}`}
              onClick={() => setEvent(null)}
              className="glass-strong flex items-center gap-3 rounded-2xl border-l-4 border-l-destructive p-3 shadow-glow"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                <ArticleImage
                  src={event.imageUrl}
                  category={event.category as CategorySlug}
                  alt={event.title}
                  sizes="56px"
                  className="object-cover"
                  emojiClass="text-2xl"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-destructive">
                  <Radio className="size-3.5 animate-pulse" /> Breaking News
                </div>
                <p className="line-clamp-2 text-sm font-medium leading-snug">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{event.source}</p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setEvent(null);
                }}
                aria-label="Dismiss"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
