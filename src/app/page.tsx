import Link from "next/link";
import {
  Newspaper,
  Sparkles,
  Zap,
  ShieldCheck,
  Languages,
  Bookmark,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "AI personalization", desc: "A feed that learns what you care about with every tap." },
  { icon: Zap, title: "Real-time breaking news", desc: "Live updates the instant a story breaks — no refresh." },
  { icon: Newspaper, title: "Smart summaries", desc: "30-second and 2-minute reads for every article." },
  { icon: Languages, title: "6 languages", desc: "English, Tamil, Hindi, Telugu, Malayalam, Kannada." },
  { icon: ShieldCheck, title: "Fact-check signals", desc: "Source credibility and verification on every card." },
  { icon: Bookmark, title: "Your library", desc: "Save, revisit, and pick up reading where you left off." },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <nav className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white shadow-glow">
            <Newspaper className="size-5" />
          </span>
          <span className="font-display text-lg font-bold">
            NewsFlow <span className="gradient-text">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-glow"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="py-16 text-center sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" /> The AI news platform for 2026
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-5xl font-bold leading-tight sm:text-6xl">
          Never need a newspaper or TV news <span className="gradient-text">again.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          NewsFlow AI learns your interests and delivers a fast, beautiful, real-time
          feed of the stories that matter to you — summarized and fact-checked.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl gradient-primary px-7 py-3 font-semibold text-white shadow-card transition hover:shadow-glow"
          >
            Create your feed <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-border bg-card px-7 py-3 font-semibold transition hover:bg-accent"
          >
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Try the demo: <span className="font-medium">demo@newsflow.ai</span> /{" "}
          <span className="font-medium">Demo1234</span>
        </p>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
