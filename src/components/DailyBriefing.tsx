"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Loader2, KeyRound } from "lucide-react";
import { ListenButton } from "@/components/ListenButton";
import { useUserStore } from "@/store/user";

const todayKey = () => `nf_brief_${new Date().toISOString().slice(0, 10)}`;

export function DailyBriefing() {
  const user = useUserStore((s) => s.user);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);

  const generate = async (force = false) => {
    if (loading) return;
    if (!force) {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) {
        setText(cached);
        return;
      }
    }
    setLoading(true);
    setNeedsKey(false);
    try {
      const apiKey = localStorage.getItem("nf_ai_key") || undefined;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "briefing", apiKey }),
      });
      const data = await res.json();
      if (data.needsKey) {
        setNeedsKey(true);
        return;
      }
      setText(data.reply ?? "");
      if (data.ok && data.reply) sessionStorage.setItem(todayKey(), data.reply);
    } catch {
      setText("⚠️ Couldn't generate your briefing — try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = user?.fullName?.split(" ")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/30 p-5 sm:p-6"
    >
      <div className="absolute inset-0 -z-10 gradient-primary opacity-[0.13]" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white shadow-glow">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">
              {first ? `${first}'s` : "Your"} AI briefing
            </h2>
            <p className="text-xs text-muted-foreground">Today&apos;s news, summarized for you</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {text && !needsKey && <ListenButton text={text} lang={user?.preferences.language ?? "en"} label={false} />}
          <button
            onClick={() => generate(true)}
            disabled={loading}
            aria-label="Regenerate"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 text-sm leading-relaxed">
        {loading && !text ? (
          <div className="space-y-2">
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-11/12 rounded" />
            <div className="shimmer h-3 w-4/5 rounded" />
          </div>
        ) : needsKey ? (
          <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <KeyRound className="size-4" /> Add a free Gemini key (🔑 in the chat helper) to unlock your daily AI briefing.
          </p>
        ) : (
          <p className="whitespace-pre-line text-foreground/90">{text}</p>
        )}
      </div>
    </motion.div>
  );
}
