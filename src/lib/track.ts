"use client";
import type { CategorySlug, InteractionType } from "@/types";

interface TrackOpts {
  articleId?: string;
  category?: CategorySlug;
  value?: number;
}

/** Fire-and-forget behavioral signal for the personalization engine. */
export function track(type: InteractionType, opts: TrackOpts = {}): void {
  try {
    const payload = JSON.stringify({ type, ...opts });
    // Use sendBeacon for read_time on unload; fetch otherwise.
    if (type === "read_time" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/interactions", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch("/api/interactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never block the UI on tracking */
  }
}
