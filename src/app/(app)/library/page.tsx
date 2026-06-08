"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, History, Sparkles } from "lucide-react";
import type { Article } from "@/types";
import { NewsCard } from "@/components/NewsCard";
import { NewsCardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "saved" | "history";

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("saved");
  const [saved, setSaved] = useState<Article[]>([]);
  const [history, setHistory] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookmarks", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSaved(d.saved ?? []);
        setHistory(d.history ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = tab === "saved" ? saved : history;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My Library</h1>
        <p className="mt-1 text-muted-foreground">Everything you&apos;ve saved and read.</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "saved"} onClick={() => setTab("saved")} icon={<Bookmark className="size-4" />} label={`Saved (${saved.length})`} />
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<History className="size-4" />} label={`Recently viewed (${history.length})`} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
            <Sparkles className="size-6" />
          </span>
          <p className="mt-4 font-display text-lg font-semibold">
            {tab === "saved" ? "No saved articles yet" : "No reading history yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "saved"
              ? "Tap the bookmark icon on any story to save it here."
              : "Articles you open will show up here."}
          </p>
          <Link href="/feed" className="mt-4 inline-block rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white">
            Explore the feed
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <NewsCard key={a.id} article={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
        active ? "gradient-primary text-white shadow-card" : "border border-border bg-card hover:bg-accent",
      )}
    >
      {icon} {label}
    </button>
  );
}
