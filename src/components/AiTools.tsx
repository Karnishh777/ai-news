"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, Loader2, Lightbulb, Scale, HelpCircle, Gauge } from "lucide-react";
import type { Article } from "@/types";
import { cn } from "@/lib/utils";

const LENSES = [
  { mode: "explain", label: "Explain simply", icon: Lightbulb },
  { mode: "why", label: "Why it matters", icon: HelpCircle },
  { mode: "perspectives", label: "Perspectives", icon: Scale },
  { mode: "bias", label: "Bias & tone", icon: Gauge },
] as const;

export function AiTools({ article }: { article: Article }) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [activeLens, setActiveLens] = useState<string | null>(null);

  const run = async (mode: string, q?: string) => {
    if (loading) return;
    setLoading(mode);
    setActiveLens(mode === "ask" ? null : mode);
    setAnswer("");
    try {
      const apiKey = localStorage.getItem("nf_ai_key") || undefined;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          question: q,
          apiKey,
          article: {
            title: article.title,
            summary: article.summary,
            content: article.content,
            source: article.source.name,
          },
        }),
      });
      const data = await res.json();
      setAnswer(data.reply ?? "No response.");
    } catch {
      setAnswer("⚠️ Network error — please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/60 to-card p-5">
      <div className="flex items-center gap-2 font-display font-semibold">
        <Sparkles className="size-4 text-primary" /> Ask AI about this story
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Grounded in this article — powered by Gemini.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {LENSES.map((l) => (
          <button
            key={l.mode}
            onClick={() => run(l.mode)}
            disabled={Boolean(loading)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-60",
              activeLens === l.mode
                ? "gradient-primary border-transparent text-white shadow-card"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            {loading === l.mode ? <Loader2 className="size-4 animate-spin" /> : <l.icon className="size-4" />}
            {l.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) run("ask", question.trim());
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about this article…"
          className="h-11 flex-1 rounded-xl border border-input bg-background/60 px-4 text-sm focus-ring"
        />
        <button
          type="submit"
          disabled={Boolean(loading) || !question.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-xl gradient-primary text-white disabled:opacity-50"
        >
          {loading === "ask" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>

      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div
              className="rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: format(answer) }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function format(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+(.*)$/gm, "• $1")
    .replace(/\n/g, "<br/>");
}
