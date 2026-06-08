"use client";
import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/news/categories";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";
import type { CategorySlug } from "@/types";

interface Props {
  active: CategorySlug | "all";
  onChange: (c: CategorySlug | "all") => void;
}

export function CategoryChips({ active, onChange }: Props) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Chip label="✨ For You" selected={active === "all"} onClick={() => onChange("all")} />
      {CATEGORIES.map((c) => (
        <Chip
          key={c.slug}
          label={`${c.emoji} ${c.label}`}
          gradient={c.gradient}
          selected={active === c.slug}
          onClick={() => {
            onChange(c.slug);
            track("category_open", { category: c.slug });
          }}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  selected,
  gradient,
  onClick,
}: {
  label: string;
  selected: boolean;
  gradient?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all",
        selected
          ? "border-transparent text-white shadow-card"
          : "border-border bg-card text-foreground/80 hover:border-primary/50 hover:text-foreground",
      )}
    >
      {selected && (
        <motion.span
          layoutId="chip-bg"
          className={cn("absolute inset-0 rounded-full bg-gradient-to-r", gradient ?? "from-primary to-fuchsia-600")}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
