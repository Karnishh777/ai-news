"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, KeyRound, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "👋 Hi! I'm your **NewsFlow Helper**. Ask me what's trending, how to change language or theme, or how to set things up.",
};

const SUGGESTIONS = [
  "What's trending?",
  "Change my language",
  "Pick a theme",
  "Enable AI",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = localStorage.getItem("nf_ai_key") ?? "";
    setApiKey(k);
    setAiEnabled(Boolean(k));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const saveKey = () => {
    const k = apiKey.trim();
    if (k) localStorage.setItem("nf_ai_key", k);
    else localStorage.removeItem("nf_ai_key");
    setAiEnabled(Boolean(k));
    setShowKey(false);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: k ? "✅ AI enabled — I can now answer questions about any topic." : "AI key removed. I'll use the built-in guide." },
    ]);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, apiKey: apiKey || undefined }),
      });
      const data = await res.json();
      setAiEnabled(Boolean(data.aiEnabled));
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "Sorry, I couldn't respond just now." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network hiccup — please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong flex h-[min(560px,75vh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl shadow-glow"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="grid size-8 place-items-center rounded-xl gradient-primary text-white">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-tight">NewsFlow Helper</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", aiEnabled ? "bg-emerald-500" : "bg-zinc-400")} />
                  {aiEnabled ? "AI enabled" : "Guide mode"}
                </p>
              </div>
              <button onClick={() => setShowKey((s) => !s)} title="AI key" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent">
                <KeyRound className="size-4" />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            {/* API key row */}
            <AnimatePresence>
              {showKey && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border bg-accent/40">
                  <div className="space-y-2 p-3">
                    <p className="text-xs text-muted-foreground">
                      Paste a free <b>Gemini</b> API key (aistudio.google.com) to unlock real AI. Stored only on this device.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        type="password"
                        placeholder="AIza…"
                        className="h-9 flex-1 rounded-lg border border-input bg-background/60 px-3 text-sm focus-ring"
                      />
                      <button onClick={saveKey} className="rounded-lg gradient-primary px-3 text-sm font-medium text-white">Save</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                      <Bot className="size-3.5" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user" ? "gradient-primary text-white" : "bg-secondary text-secondary-foreground",
                    )}
                    dangerouslySetInnerHTML={{ __html: format(msg.content) }}
                  />
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="grid size-6 place-items-center rounded-lg bg-accent text-primary"><Bot className="size-3.5" /></span>
                  <span className="flex gap-1 px-2">
                    <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
                  </span>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/50">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about NewsFlow…"
                className="h-10 flex-1 rounded-xl border border-input bg-background/60 px-3 text-sm focus-ring"
              />
              <button type="submit" disabled={loading || !input.trim()} className="grid size-10 shrink-0 place-items-center rounded-xl gradient-primary text-white disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open NewsFlow Helper"
        className="grid size-14 place-items-center rounded-full gradient-primary text-white shadow-glow"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <Sparkles className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="size-1.5 rounded-full bg-current"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}

/** Escape HTML, then apply minimal markdown: **bold** and line breaks. */
function format(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}
