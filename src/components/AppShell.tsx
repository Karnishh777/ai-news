"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Zap,
  Search,
  Bookmark,
  BarChart3,
  Sparkles,
  LogOut,
  Newspaper,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./NotificationsBell";
import { BreakingNewsToast } from "./BreakingNewsToast";
import { AssistantWidget } from "./AssistantWidget";

const NAV = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/shorts", label: "Shorts", icon: Zap },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const [q, setQ] = useState("");

  const nav = [...NAV];
  if (user?.role === "admin") nav.push({ href: "/admin", label: "Admin", icon: BarChart3 });

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="glass-strong sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/feed" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white shadow-glow">
              <Newspaper className="size-5" />
            </span>
            <span className="hidden font-display text-lg font-bold sm:block">
              NewsFlow <span className="gradient-text">AI</span>
            </span>
          </Link>

          <form onSubmit={onSearch} className="relative ml-2 hidden flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search topics, companies, people, events…"
              className="h-10 w-full rounded-xl border border-border bg-background/60 pl-10 pr-4 text-sm focus-ring"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />
            <ThemeToggle />
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/settings"
                aria-label="Settings"
                title="Settings"
                className="grid size-9 place-items-center rounded-full gradient-primary text-sm font-bold text-white transition-transform hover:scale-105"
              >
                {(user?.fullName ?? "?").slice(0, 1).toUpperCase()}
              </Link>
              <button
                onClick={onLogout}
                aria-label="Log out"
                className="grid size-10 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-accent"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "gradient-primary text-white shadow-card"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Personalized
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your feed sharpens with every read, like, and save.
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border py-2 lg:hidden">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-muted-foreground"
        >
          <LogOut className="size-5" />
          Exit
        </button>
      </nav>

      <BreakingNewsToast />
      <AssistantWidget />
    </div>
  );
}
