import Image from "next/image";
import { getCategory } from "@/lib/news/categories";
import { cn } from "@/lib/utils";
import type { CategorySlug } from "@/types";

interface Props {
  src?: string | null;
  category: CategorySlug;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  emojiClass?: string;
}

/**
 * Renders a real image when one is available, otherwise a clean, category-
 * themed gradient placeholder (with the category emoji) — so aggregated news
 * without a source image never shows a random, unrelated stock photo.
 * Must be placed inside a `relative` container (uses `fill`).
 */
export function ArticleImage({ src, category, alt, sizes, className, priority, emojiClass }: Props) {
  const cat = getCategory(category);
  if (src) {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
    );
  }
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", cat.gradient)}
      aria-label={alt}
    >
      <span className={cn("opacity-90 drop-shadow-lg", emojiClass ?? "text-5xl")}>{cat.emoji}</span>
    </div>
  );
}
