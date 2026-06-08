"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME_IDS } from "@/lib/themes";

export type TextSize = "sm" | "base" | "lg";

interface UIState {
  theme: "light" | "dark";
  palette: string; // theme id from THEMES
  textSize: TextSize;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  setPalette: (id: string) => void;
  setTextSize: (s: TextSize) => void;
  applyTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      palette: "default",
      textSize: "base",
      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },
      toggleTheme: () => {
        set({ theme: get().theme === "dark" ? "light" : "dark" });
        get().applyTheme();
      },
      setPalette: (palette) => {
        set({ palette });
        get().applyTheme();
      },
      setTextSize: (textSize) => set({ textSize }),
      applyTheme: () => {
        if (typeof document === "undefined") return;
        const root = document.documentElement;
        root.classList.toggle("dark", get().theme === "dark");
        const p = get().palette;
        if (p && p !== "default" && THEME_IDS.includes(p)) root.dataset.theme = p;
        else delete root.dataset.theme;
      },
    }),
    { name: "newsflow-ui" },
  ),
);
