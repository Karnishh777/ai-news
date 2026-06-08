import { cn } from "@/lib/utils";
import type { FactCheckStatus } from "@/types";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

const FACT_STYLES: Record<FactCheckStatus, { label: string; cls: string; dot: string }> = {
  verified: { label: "Verified", cls: "bg-emerald-500/15 text-emerald-500", dot: "bg-emerald-500" },
  developing: { label: "Developing", cls: "bg-amber-500/15 text-amber-500", dot: "bg-amber-500" },
  opinion: { label: "Opinion", cls: "bg-sky-500/15 text-sky-500", dot: "bg-sky-500" },
  unverified: { label: "Unverified", cls: "bg-zinc-500/15 text-zinc-400", dot: "bg-zinc-400" },
};

export function FactCheckBadge({ status }: { status: FactCheckStatus }) {
  const s = FACT_STYLES[status];
  return (
    <Badge className={s.cls}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}
