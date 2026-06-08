// ─────────────────────────────────────────────────────────────
// Theme palettes
//
// Each theme is a named accent palette inspired by a content category
// (e.g. "PlayStation" for gaming). Selecting one sets `data-theme` on
// <html>; the matching CSS in globals.css overrides the accent + gradient
// variables. The HSL values here MUST match those CSS blocks — they're also
// used to render the swatch previews in Settings.
// ─────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  /** Short vibe / category association shown under the name. */
  hint: string;
  emoji: string;
  /** HSL triplets ("H S% L%") for the preview swatch + accent. */
  from: string;
  to: string;
}

export const THEMES: Theme[] = [
  { id: "default", name: "NewsFlow", hint: "Default", emoji: "✨", from: "256 90% 60%", to: "292 84% 58%" },
  { id: "playstation", name: "PlayStation", hint: "Gaming", emoji: "🎮", from: "211 100% 45%", to: "199 95% 50%" },
  { id: "neon", name: "Cyberpunk", hint: "Gaming · neon", emoji: "👾", from: "318 90% 58%", to: "190 95% 55%" },
  { id: "emerald", name: "Markets", hint: "Finance · Stocks", emoji: "📈", from: "152 70% 42%", to: "168 76% 44%" },
  { id: "sunset", name: "Cinema", hint: "Movies", emoji: "🎬", from: "12 90% 58%", to: "330 85% 60%" },
  { id: "crimson", name: "Arena", hint: "Sports", emoji: "🏟️", from: "0 80% 56%", to: "28 92% 55%" },
  { id: "ocean", name: "Globe", hint: "World", emoji: "🌍", from: "199 90% 48%", to: "221 84% 56%" },
  { id: "forest", name: "Nature", hint: "Environment", emoji: "🌱", from: "142 58% 40%", to: "96 60% 45%" },
  { id: "gold", name: "Boardroom", hint: "Business", emoji: "💼", from: "38 92% 50%", to: "12 86% 55%" },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export function swatch(theme: Theme): string {
  return `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))`;
}
