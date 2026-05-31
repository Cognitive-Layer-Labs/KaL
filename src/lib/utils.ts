import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKAL(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function difficultyLabel(preset?: string): string {
  if (preset === "easy") return "Easy";
  if (preset === "hard") return "Hard";
  return "Medium";
}

export function difficultyColor(preset?: string): string {
  if (preset === "easy") return "text-emerald-400";
  if (preset === "hard") return "text-rose-400";
  return "text-amber-400";
}

export function bloomColor(level: string): string {
  const map: Record<string, string> = {
    Remember: "#94a3b8",
    Understand: "#60a5fa",
    Apply: "#34d399",
    Analyze: "#fbbf24",
    Evaluate: "#f97316",
    Create: "#e879f9",
  };
  return map[level] ?? "#94a3b8";
}
