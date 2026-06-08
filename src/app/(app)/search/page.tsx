"use client";
import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, Loader2, X, TrendingUp } from "lucide-react";
import type { Article } from "@/types";
import { NewsCard } from "@/components/NewsCard";
import { NewsCardSkeleton } from "@/components/ui/skeleton";

const POPULAR = ["AI", "Elections", "Stock market", "Cricket", "Climate", "SpaceX", "Startups"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") ?? "";
    if (initial) setQ(initial);
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setSuggestions([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setResults(d.results ?? []);
          setSuggestions(d.suggestions ?? []);
          setSearched(true);
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Search</h1>
        <p className="mt-1 text-muted-foreground">Topics, companies, people, countries, events.</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the news…"
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-12 text-lg shadow-card focus-ring focus-visible:border-primary"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Suggestions / popular */}
      {q.trim().length < 2 ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4" /> Popular searches
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <button
                key={p}
                onClick={() => setQ(p)}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:text-primary"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground transition hover:brightness-110"
              >
                {s}
              </button>
            ))}
          </div>
        )
      )}

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No results for &ldquo;{q}&rdquo;. Try a different term.
        </p>
      ) : (
        results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">{results.length} results</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((a, i) => (
                <NewsCard key={a.id} article={a} index={i} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
