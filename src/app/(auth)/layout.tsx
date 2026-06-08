import Link from "next/link";
import { Newspaper } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(40rem 40rem at 20% 20%, rgba(255,255,255,.35), transparent 60%), radial-gradient(30rem 30rem at 90% 80%, rgba(0,0,0,.25), transparent 60%)",
          }}
        />
        <Link href="/" className="relative flex items-center gap-2 text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <Newspaper className="size-6" />
          </span>
          <span className="font-display text-xl font-bold">NewsFlow AI</span>
        </Link>
        <div className="relative max-w-md text-white">
          <h2 className="font-display text-4xl font-bold leading-tight text-balance">
            Your world, personalized — and always up to date.
          </h2>
          <p className="mt-4 text-white/80">
            AI-curated headlines, instant summaries, and breaking news the moment it
            happens. The last news app you&apos;ll ever need.
          </p>
          <div className="mt-8 flex gap-6 text-sm text-white/80">
            <div>
              <div className="font-display text-2xl font-bold text-white">20+</div>
              topics
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">6</div>
              languages
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">Real-time</div>
              updates
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
