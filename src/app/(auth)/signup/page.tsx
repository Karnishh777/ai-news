"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, User, Mail, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RULES = [
  { test: (p: string) => p.length >= 8, label: "8+ characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "Uppercase" },
  { test: (p: string) => /[a-z]/.test(p), label: "Lowercase" },
  { test: (p: string) => /[0-9]/.test(p), label: "Number" },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrors({});
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        setErrors(data.details ?? {});
        return;
      }
      if (data.devCode) sessionStorage.setItem("nf_devcode", data.devCode);
      if (data.ticket) sessionStorage.setItem("nf_ticket", data.ticket);
      router.push(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll email you a code to verify it&apos;s really you.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field icon={<User className="size-4" />} error={errors.fullName?.[0]}>
          <Input placeholder="Full name" value={form.fullName} onChange={set("fullName")} required className="pl-10" />
        </Field>
        <Field icon={<Mail className="size-4" />} error={errors.email?.[0]}>
          <Input type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} autoComplete="email" required className="pl-10" />
        </Field>
        <Field icon={<Lock className="size-4" />} error={errors.password?.[0]}>
          <Input type="password" placeholder="Password" value={form.password} onChange={set("password")} autoComplete="new-password" required className="pl-10" />
        </Field>

        <div className="flex flex-wrap gap-2">
          {RULES.map((r) => {
            const ok = r.test(form.password);
            return (
              <span
                key={r.label}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                  ok ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                }`}
              >
                <Check className="size-3" /> {r.label}
              </span>
            );
          })}
        </div>

        <Field icon={<Lock className="size-4" />} error={errors.confirmPassword?.[0]}>
          <Input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" required className="pl-10" />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </motion.div>
  );
}

function Field({
  icon,
  error,
  children,
}: {
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
