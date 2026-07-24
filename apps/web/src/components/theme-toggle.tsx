"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme"
      className={`flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-muted transition-colors hover:text-text ${className}`}>
      {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
