"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return <div className="h-9 w-36" />;
  }

  const isLight = theme === "light";

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[var(--border-col)] bg-[#061b20]/90 p-1 shadow-sm">
      <button
        onClick={() => setTheme("light")}
        aria-label="Modo claro"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          isLight
            ? "bg-[#f5fbf8] text-[#102c29] shadow-sm"
            : "text-[#9bb9b4] hover:text-white"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
        </svg>
        Claro
      </button>
      <button
        onClick={() => setTheme("dark")}
        aria-label="Modo escuro"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          !isLight
            ? "bg-[#73d9cb] text-[#07161a] shadow-sm"
            : "text-[#9bb9b4] hover:text-white"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        Escuro
      </button>
    </div>
  );
}
