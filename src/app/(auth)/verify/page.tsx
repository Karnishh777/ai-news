"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user";

export default function VerifyPage() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email") ?? "";
    setEmail(e);
    setDevCode(sessionStorage.getItem("nf_devcode"));
    setTicket(sessionStorage.getItem("nf_ticket"));
  }, []);

  const code = digits.join("");

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? "" : x)));
      return;
    }
    // Support paste of full code into one box.
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      setDigits(Array.from({ length: 6 }, (_, idx) => next[idx] ?? ""));
      inputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, idx) => (idx === i ? clean : x)));
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticket, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      sessionStorage.removeItem("nf_devcode");
      sessionStorage.removeItem("nf_ticket");
      setUser(data.user);
      router.push(data.next || "/onboarding");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not resend the code. Please sign up again.");
      return;
    }
    if (data.ticket) {
      setTicket(data.ticket);
      sessionStorage.setItem("nf_ticket", data.ticket);
    }
    if (data.devCode) {
      setDevCode(data.devCode);
      sessionStorage.setItem("nf_devcode", data.devCode);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl gradient-primary text-white shadow-glow">
        <ShieldCheck className="size-7" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code we sent to
        <br />
        <span className="font-medium text-foreground">{email || "your email"}</span>
      </p>

      {devCode && (
        <p className="mx-auto mt-4 w-fit rounded-lg bg-accent px-3 py-1.5 text-xs text-accent-foreground">
          Dev mode — your code is <span className="font-bold">{devCode}</span>
        </p>
      )}

      <form onSubmit={submit} className="mt-8">
        <div className="flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={6}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="size-12 rounded-xl border border-input bg-background/60 text-center text-xl font-bold focus-ring focus-visible:border-primary"
            />
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading || code.length !== 6}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify & continue"}
        </Button>
      </form>

      <button onClick={resend} className="mt-4 text-sm text-primary hover:underline">
        Didn&apos;t get it? Resend code
      </button>
    </motion.div>
  );
}
