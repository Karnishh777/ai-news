"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Loader2, Check, X, Trophy, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

type Phase = "idle" | "loading" | "playing" | "done" | "needsKey";

export function NewsQuiz() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const start = async () => {
    setPhase("loading");
    try {
      const apiKey = localStorage.getItem("nf_ai_key") || undefined;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "quiz", apiKey }),
      });
      const data = await res.json();
      if (data.needsKey) return setPhase("needsKey");
      if (!data.quiz?.length) return setPhase("idle");
      setQuiz(data.quiz);
      setI(0);
      setScore(0);
      setPicked(null);
      setPhase("playing");
    } catch {
      setPhase("idle");
    }
  };

  const choose = (opt: number) => {
    if (picked !== null) return;
    setPicked(opt);
    if (opt === quiz[i].answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 >= quiz.length) return setPhase("done");
    setI((x) => x + 1);
    setPicked(null);
  };

  const current = quiz[i];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-card">
          <Brain className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Test your news IQ</h2>
          <p className="text-xs text-muted-foreground">A quick AI quiz from today&apos;s headlines</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <button onClick={start} className="rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:shadow-glow">
              Start quiz
            </button>
          </motion.div>
        )}

        {phase === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Generating your quiz…
          </motion.div>
        )}

        {phase === "needsKey" && (
          <motion.p key="needsKey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <KeyRound className="size-4" /> Add a free Gemini key (🔑 in the chat helper) to play the AI quiz.
          </motion.p>
        )}

        {phase === "playing" && current && (
          <motion.div key={`q-${i}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Question {i + 1} of {quiz.length}</span>
              <span>Score {score}</span>
            </div>
            <p className="font-medium">{current.q}</p>
            <div className="mt-3 space-y-2">
              {current.options.map((opt, idx) => {
                const isAnswer = idx === current.answer;
                const isPicked = idx === picked;
                const show = picked !== null;
                return (
                  <button
                    key={idx}
                    onClick={() => choose(idx)}
                    disabled={show}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-all",
                      !show && "border-border hover:border-primary/50",
                      show && isAnswer && "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      show && isPicked && !isAnswer && "border-destructive bg-destructive/10 text-destructive",
                      show && !isAnswer && !isPicked && "border-border opacity-60",
                    )}
                  >
                    {opt}
                    {show && isAnswer && <Check className="size-4" />}
                    {show && isPicked && !isAnswer && <X className="size-4" />}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-3 flex items-center justify-between gap-3">
                {current.explain ? <p className="text-xs text-muted-foreground">{current.explain}</p> : <span />}
                <button onClick={next} className="shrink-0 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white">
                  {i + 1 >= quiz.length ? "See result" : "Next"}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-5 text-center">
            <Trophy className="mx-auto size-10 text-amber-500" />
            <p className="mt-2 font-display text-2xl font-bold">
              {score} / {quiz.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {score === quiz.length ? "Perfect — you're a news pro! 🏆" : score >= quiz.length / 2 ? "Nice — well informed! 👏" : "Keep reading to level up 📈"}
            </p>
            <button onClick={start} className="mt-4 rounded-xl border border-border bg-card px-5 py-2 text-sm font-semibold transition hover:bg-accent">
              Play again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
