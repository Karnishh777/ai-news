import type { Category, CategorySlug } from "@/types";

export const CATEGORIES: Category[] = [
  { slug: "technology", label: "Technology", emoji: "💻", gradient: "from-sky-500 to-indigo-500" },
  { slug: "ai", label: "AI", emoji: "🤖", gradient: "from-violet-500 to-fuchsia-500" },
  { slug: "science", label: "Science", emoji: "🔬", gradient: "from-emerald-500 to-teal-500" },
  { slug: "business", label: "Business", emoji: "📈", gradient: "from-amber-500 to-orange-500" },
  { slug: "finance", label: "Finance", emoji: "💰", gradient: "from-green-500 to-emerald-600" },
  { slug: "startups", label: "Startups", emoji: "🚀", gradient: "from-pink-500 to-rose-500" },
  { slug: "cricket", label: "Cricket", emoji: "🏏", gradient: "from-lime-500 to-green-500" },
  { slug: "football", label: "Football", emoji: "⚽", gradient: "from-blue-500 to-cyan-500" },
  { slug: "sports", label: "Sports", emoji: "🏅", gradient: "from-orange-500 to-red-500" },
  { slug: "movies", label: "Movies", emoji: "🎬", gradient: "from-red-500 to-pink-600" },
  { slug: "gaming", label: "Gaming", emoji: "🎮", gradient: "from-purple-500 to-indigo-600" },
  { slug: "politics", label: "Politics", emoji: "🏛️", gradient: "from-slate-500 to-gray-600" },
  { slug: "education", label: "Education", emoji: "🎓", gradient: "from-cyan-500 to-blue-500" },
  { slug: "health", label: "Health", emoji: "🩺", gradient: "from-rose-500 to-red-500" },
  { slug: "space", label: "Space", emoji: "🛰️", gradient: "from-indigo-500 to-purple-600" },
  { slug: "world", label: "World", emoji: "🌍", gradient: "from-teal-500 to-cyan-600" },
  { slug: "local", label: "Local", emoji: "📍", gradient: "from-yellow-500 to-amber-500" },
  { slug: "environment", label: "Environment", emoji: "🌱", gradient: "from-green-500 to-lime-600" },
  { slug: "stock-market", label: "Stock Market", emoji: "📊", gradient: "from-emerald-500 to-green-600" },
  { slug: "entrepreneurship", label: "Entrepreneurship", emoji: "🧠", gradient: "from-fuchsia-500 to-pink-600" },
];

export const CATEGORY_MAP: Record<CategorySlug, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

export function getCategory(slug: CategorySlug): Category {
  return CATEGORY_MAP[slug] ?? CATEGORIES[0];
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
] as const;
