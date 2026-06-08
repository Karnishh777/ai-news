"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2, Sun, Moon, Monitor, LogOut, Palette, User as UserIcon } from "lucide-react";
import { CATEGORIES, LANGUAGES } from "@/lib/news/categories";
import { THEMES, swatch } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUIStore, type TextSize } from "@/store/ui";
import { useUserStore } from "@/store/user";
import type {
  CategorySlug,
  Language,
  NewsLength,
  NotificationPreference,
} from "@/types";

const LENGTHS: { value: NewsLength; label: string }[] = [
  { value: "headlines", label: "Headlines" },
  { value: "short", label: "Short" },
  { value: "detailed", label: "Detailed" },
];
const NOTIFS: { value: NotificationPreference; label: string }[] = [
  { value: "breaking", label: "Breaking" },
  { value: "digest", label: "Daily digest" },
  { value: "both", label: "Both" },
];
const SIZES: { value: TextSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "base", label: "Default" },
  { value: "lg", label: "Large" },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const logout = useUserStore((s) => s.logout);

  const { theme, setTheme, palette, setPalette, textSize, setTextSize } = useUIStore();

  const [fullName, setFullName] = useState("");
  const [interests, setInterests] = useState<CategorySlug[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [newsLength, setNewsLength] = useState<NewsLength>("short");
  const [notification, setNotification] = useState<NotificationPreference>("both");
  const [location, setLocation] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Hydrate the form from the current user.
  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setInterests(user.preferences.interests);
    setLanguage(user.preferences.language);
    setNewsLength(user.preferences.newsLength);
    setNotification(user.preferences.notification);
    setLocation(user.preferences.location ?? "");
  }, [user]);

  const toggleInterest = (c: CategorySlug) =>
    setInterests((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const save = async () => {
    setError("");
    if (interests.length < 3) {
      setError("Please keep at least 3 interests.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, interests, language, newsLength, notification, location: location || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Personalize your feed and the look of NewsFlow.</p>
      </div>

      {/* Appearance */}
      <Section icon={<Palette className="size-5" />} title="Appearance" subtitle="Theme, accent color and text size (saved on this device).">
        <Label>Mode</Label>
        <div className="flex gap-2">
          <Segmented active={theme === "light"} onClick={() => setTheme("light")}><Sun className="size-4" /> Light</Segmented>
          <Segmented active={theme === "dark"} onClick={() => setTheme("dark")}><Moon className="size-4" /> Dark</Segmented>
        </div>

        <Label className="mt-6">Accent theme</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = palette === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setPalette(t.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                  active ? "border-primary shadow-card ring-2 ring-primary" : "border-border hover:border-primary/50",
                )}
              >
                <div className="h-12 w-full rounded-lg" style={{ background: swatch(t) }} />
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold leading-tight">{t.emoji} {t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </div>
                  {active && <Check className="size-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>

        <Label className="mt-6">Text size</Label>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <Segmented key={s.value} active={textSize === s.value} onClick={() => setTextSize(s.value)}>
              <Monitor className="size-4" /> {s.label}
            </Segmented>
          ))}
        </div>
      </Section>

      {/* Profile */}
      <Section icon={<UserIcon className="size-5" />} title="Profile" subtitle="Your account details.">
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        <Label className="mt-4">Email</Label>
        <Input value={user.email} disabled className="opacity-70" />
      </Section>

      {/* Interests */}
      <Section title="Interests" subtitle="Pick the topics that shape your feed (min 3).">
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => {
            const on = interests.includes(c.slug);
            return (
              <button
                key={c.slug}
                onClick={() => toggleInterest(c.slug)}
                className={cn(
                  "rounded-2xl border px-3.5 py-2 text-sm font-medium transition-all",
                  on ? "border-transparent bg-gradient-to-r text-white shadow-card " + c.gradient : "border-border bg-card hover:border-primary/50",
                )}
              >
                {c.emoji} {c.label}
                {on && <Check className="ml-1 inline size-3.5" />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{interests.length} selected</p>
      </Section>

      {/* Preferences */}
      <Section title="Reading & alerts" subtitle="Language, length and how we notify you.">
        <Label>Language</Label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus-ring"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <Label className="mt-4">News length</Label>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((l) => (
            <Segmented key={l.value} active={newsLength === l.value} onClick={() => setNewsLength(l.value)}>{l.label}</Segmented>
          ))}
        </div>

        <Label className="mt-4">Notifications</Label>
        <div className="flex flex-wrap gap-2">
          {NOTIFS.map((n) => (
            <Segmented key={n.value} active={notification === n.value} onClick={() => setNotification(n.value)}>{n.label}</Segmented>
          ))}
        </div>

        <Label className="mt-4">Location (for local news)</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl glass-strong p-3 shadow-card lg:bottom-6">
        <div className="text-sm">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : saved ? (
            <span className="text-emerald-500">✓ Saved</span>
          ) : (
            <span className="text-muted-foreground">Changes apply to your personalized feed.</span>
          )}
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>

      {/* Account */}
      <Section title="Account" subtitle="Sign out of this device.">
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">{icon}</span>}
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mb-2 text-sm font-medium", className)}>{children}</p>;
}

function Segmented({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
        active ? "gradient-primary border-transparent text-white shadow-card" : "border-border bg-card hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}
