"use client";
import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  Bookmark,
  Newspaper,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory } from "@/lib/news/categories";
import { compactNumber } from "@/lib/utils";
import type { CategorySlug, InteractionType } from "@/types";

interface Stats {
  kpis: { totalUsers: number; onboarded: number; interactions: number; bookmarks: number; articles: number };
  engagement: { type: InteractionType; count: number }[];
  topInterests: { category: CategorySlug; count: number }[];
  trending: { id: string; title: string; category: CategorySlug; score: number }[];
  growth: { date: string; users: number }[];
  sources: string[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const maxEng = Math.max(1, ...stats.engagement.map((e) => e.count));
  const maxGrowth = Math.max(1, ...stats.growth.map((g) => g.users));
  const maxInterest = Math.max(1, ...stats.topInterests.map((i) => i.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform health, engagement, and growth.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={<Users className="size-5" />} label="Total users" value={compactNumber(stats.kpis.totalUsers)} />
        <Kpi icon={<CheckCircle2 className="size-5" />} label="Onboarded" value={compactNumber(stats.kpis.onboarded)} />
        <Kpi icon={<Activity className="size-5" />} label="Interactions" value={compactNumber(stats.kpis.interactions)} />
        <Kpi icon={<Bookmark className="size-5" />} label="Bookmarks" value={compactNumber(stats.kpis.bookmarks)} />
        <Kpi icon={<Newspaper className="size-5" />} label="Articles" value={compactNumber(stats.kpis.articles)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User growth */}
        <Panel title="User growth (14 days)">
          <div className="flex h-44 items-end gap-1.5">
            {stats.growth.map((g) => (
              <div key={g.date} className="group flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md gradient-primary transition-all group-hover:opacity-80"
                  style={{ height: `${(g.users / maxGrowth) * 100}%` }}
                  title={`${g.date}: ${g.users}`}
                />
                <span className="hidden text-[9px] text-muted-foreground sm:block">{g.date.slice(3)}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Engagement by type */}
        <Panel title="Engagement by action">
          <div className="space-y-3">
            {stats.engagement.map((e) => (
              <div key={e.type}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{e.type.replace("_", " ")}</span>
                  <span className="font-medium">{e.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${(e.count / maxEng) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Top interests */}
        <Panel title="Top interests">
          {stats.topInterests.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {stats.topInterests.map((it) => {
                const c = getCategory(it.category);
                return (
                  <div key={it.category}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{c.emoji} {c.label}</span>
                      <span className="font-medium">{it.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full bg-gradient-to-r ${c.gradient}`} style={{ width: `${(it.count / maxInterest) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Trending topics */}
        <Panel title="Trending topics">
          <ol className="space-y-2">
            {stats.trending.map((t, i) => {
              const c = getCategory(t.category);
              return (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="line-clamp-1 flex-1">{t.title}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3" /> {t.score}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      {/* Sources */}
      <Panel title="Active news sources">
        <div className="flex flex-wrap gap-2">
          {stats.sources.map((s) => (
            <span key={s} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm">
              {s}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">{icon}</span>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No data yet.</p>;
}
