"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Newspaper, MapPin } from "lucide-react";
import { CATEGORIES, LANGUAGES } from "@/lib/news/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import type {
  CategorySlug,
  Language,
  NewsLength,
  NotificationPreference,
} from "@/types";

const LENGTHS: { value: NewsLength; title: string; desc: string }[] = [
  { value: "headlines", title: "Headlines only", desc: "Just the essentials, lightning fast." },
  { value: "short", title: "Short summary", desc: "A tight 40-word brief per story." },
  { value: "detailed", title: "Detailed article", desc: "The full story with context." },
];

const NOTIFS: { value: NotificationPreference; title: string; desc: string }[] = [
  { value: "breaking", title: "Breaking news", desc: "Only the big, urgent stories." },
  { value: "digest", title: "Daily digest", desc: "One curated roundup each day." },
  { value: "both", title: "Both", desc: "Breaking alerts + a daily digest." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [interests, setInterests] = useState<CategorySlug[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [newsLength, setNewsLength] = useState<NewsLength>("short");
  const [notification, setNotification] = useState<NotificationPreference>("both");
  const [location, setLocation] = useState("");

  const toggleInterest = (c: CategorySlug) =>
    setInterests((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const steps = ["Interests", "Language", "Reading", "Alerts"];
  const canNext = step === 0 ? interests.length >= 3 : true;

  const finish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          interests,
          language,
          newsLength,
          notification,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        router.push("/feed");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const next = () => (step < steps.length - 1 ? setStep((s) => s + 1) : finish());

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8">
      <header className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white shadow-glow">
          <Newspaper className="size-5" />
        </span>
        <span className="font-display text-lg font-bold">
          NewsFlow <span className="gradient-text">AI</span>
        </span>
      </header>

      {/* Progress */}
      <div className="mt-8 flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= step ? "gradient-primary" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "mt-2 block text-xs font-medium",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div>
                <h1 className="font-display text-3xl font-bold">What are you into?</h1>
                <p className="mt-2 text-muted-foreground">
                  Pick at least 3. Your feed is built around these.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {CATEGORIES.map((c) => {
                    const on = interests.includes(c.slug);
                    return (
                      <button
                        key={c.slug}
                        onClick={() => toggleInterest(c.slug)}
                        className={cn(
                          "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all",
                          on
                            ? "border-transparent bg-gradient-to-r text-white shadow-card " + c.gradient
                            : "border-border bg-card hover:border-primary/50",
                        )}
                      >
                        {c.emoji} {c.label}
                        {on && <Check className="ml-1 inline size-3.5" />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{interests.length} selected</p>
              </div>
            )}

            {step === 1 && (
              <div>
                <h1 className="font-display text-3xl font-bold">Preferred language</h1>
                <p className="mt-2 text-muted-foreground">We&apos;ll prioritize news in this language.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code as Language)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        language === l.code
                          ? "border-primary bg-accent shadow-card"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      <span className="font-display text-lg font-semibold">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 className="font-display text-3xl font-bold">How do you like to read?</h1>
                <p className="mt-2 text-muted-foreground">You can change this anytime.</p>
                <div className="mt-6 space-y-3">
                  {LENGTHS.map((l) => (
                    <SelectCard
                      key={l.value}
                      selected={newsLength === l.value}
                      title={l.title}
                      desc={l.desc}
                      onClick={() => setNewsLength(l.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h1 className="font-display text-3xl font-bold">Stay in the loop</h1>
                <p className="mt-2 text-muted-foreground">Choose how we notify you.</p>
                <div className="mt-6 space-y-3">
                  {NOTIFS.map((n) => (
                    <SelectCard
                      key={n.value}
                      selected={notification === n.value}
                      title={n.title}
                      desc={n.desc}
                      onClick={() => setNotification(n.value)}
                    />
                  ))}
                </div>
                <div className="mt-6">
                  <label className="text-sm font-medium">Location (optional)</label>
                  <p className="mb-2 text-xs text-muted-foreground">Used for local news personalization.</p>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="City, Country"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button onClick={next} disabled={!canNext || loading} size="lg">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : step === steps.length - 1 ? (
            "Build my feed"
          ) : (
            <>
              Continue <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SelectCard({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all",
        selected ? "border-primary bg-accent shadow-card" : "border-border bg-card hover:border-primary/50",
      )}
    >
      <div>
        <p className="font-display font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && <Check className="size-4" />}
      </span>
    </button>
  );
}
