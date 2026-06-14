"use client";

import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  titulo: string;
  descricao?: string;
}

export function Header({ titulo, descricao }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-col)] bg-[var(--bg-panel)]/95 backdrop-blur-md">
      <div className="flex min-h-[70px] flex-col items-start justify-between gap-2 px-3 py-3 sm:flex-row sm:items-center md:gap-6 md:px-5">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-[var(--text-primary)] md:text-xl">
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-0.5 hidden text-xs text-[var(--text-secondary)] sm:block">{descricao}</p>
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
