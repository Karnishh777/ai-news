"use client";
import { useEffect } from "react";
import { useUIStore } from "@/store/ui";
import { useUserStore } from "@/store/user";

const FONT_SCALE = { sm: "15px", base: "16px", lg: "17.5px" } as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const applyTheme = useUIStore((s) => s.applyTheme);
  const textSize = useUIStore((s) => s.textSize);
  const fetchMe = useUserStore((s) => s.fetchMe);

  // Apply theme (dark + palette) and load the current user once on mount.
  useEffect(() => {
    applyTheme();
    fetchMe();
  }, [applyTheme, fetchMe]);

  // Reflect the chosen text size by scaling the root font size.
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALE[textSize] ?? FONT_SCALE.base;
  }, [textSize]);

  return <>{children}</>;
}
