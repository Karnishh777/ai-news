"use client";
import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/types";

const LANG_MAP: Record<Language, string> = {
  en: "en-US",
  ta: "ta-IN",
  hi: "hi-IN",
  te: "te-IN",
  ml: "ml-IN",
  kn: "kn-IN",
};

interface Props {
  text: string;
  lang?: Language;
  className?: string;
  label?: boolean;
}

/** Reads text aloud using the browser's built-in speech synthesis. */
export function ListenButton({ text, lang = "en", className, label = true }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 4000));
    const target = LANG_MAP[lang] ?? "en-US";
    u.lang = target;
    const voice = synth.getVoices().find((v) => v.lang === target) ?? synth.getVoices().find((v) => v.lang.startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      aria-label={speaking ? "Stop" : "Listen"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
        speaking && "text-primary",
        className,
      )}
    >
      {speaking ? <Square className="size-4 fill-current" /> : <Volume2 className="size-4" />}
      {label && (speaking ? "Stop" : "Listen")}
    </button>
  );
}
