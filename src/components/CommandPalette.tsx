"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Home,
  Zap,
  Bookmark,
  Settings,
  Moon,
  Sun,
  CornerDownLeft,
  Newspaper,
} from "lucide-react";
import type { Article } from "@/types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import { getCategory } from "@/lib/news/categories";

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

// Global command palette (⌘K / Ctrl+K): jump anywhere + live article search.
export function CommandPalette() {
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setResults([]);
    setActive(0);
  }, []);

  // Open with ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Debounced live search
  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults((d.results ?? []).slice(0, 6)))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const actions: Item[] = useMemo(
    () => [
      { id: "home", label: "Home feed", icon: <Home className="size-4" />, run: () => router.push("/feed") },
      { id: "shorts", label: "Shorts", hint: "Swipe news", icon: <Zap className="size-4" />, run: () => router.push("/shorts") },
      { id: "search", label: "Search", icon: <Search className="size-4" />, run: () => router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search") },
      { id: "library", label: "Library", icon: <Bookmark className="size-4" />, run: () => router.push("/library") },
      { id: "settings", label: "Settings", icon: <Settings className="size-4" />, run: () => router.push("/settings") },
      {
        id: "theme",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />,
        run: () => toggleTheme(),
      },
    ],
    [router, q, theme, toggleTheme],
  );

  const filteredActions = useMemo(() => {
    if (!q.trim()) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  }, [actions, q]);

  const resultItems: Item[] = results.map((a) => ({
    id: a.id,
    label: a.title,
    hint: a.source.name,
    icon: <span>{getCategory(a.category).emoji}</span>,
    run: () => router.push(`/article/${a.id}`),
  }));

  const flat = [...filteredActions, ...resultItems];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[active]?.run();
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-glow"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search news or jump to…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:block">esc</kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredActions.length > 0 && (
                <Section title="Go to">
                  {filteredActions.map((it) => (
                    <Row key={it.id} item={it} active={flat[active]?.id === it.id} onHover={() => setActive(flat.indexOf(it))} onRun={() => { it.run(); close(); }} />
                  ))}
                </Section>
              )}
              {resultItems.length > 0 && (
                <Section title="Articles">
                  {resultItems.map((it) => (
                    <Row key={it.id} item={it} active={flat[active]?.id === it.id} onHover={() => setActive(flat.indexOf(it))} onRun={() => { it.run(); close(); }} />
                  ))}
                </Section>
              )}
              {q.trim().length >= 2 && flat.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No matches.</p>
              )}
              {!q && (
                <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
                  <Newspaper className="size-3.5" /> Type to search live news, or pick a destination.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({ item, active, onHover, onRun }: { item: Item; active: boolean; onHover: () => void; onRun: () => void }) {
  return (
    <button
      onMouseEnter={onHover}
      onClick={onRun}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-card text-primary">{item.icon}</span>
      <span className="line-clamp-1 flex-1">{item.label}</span>
      {item.hint && <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>}
      {active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
    </button>
  );
}
