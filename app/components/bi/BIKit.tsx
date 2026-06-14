"use client";

import type { ReactNode } from "react";

export function BISection({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)] ${className}`}
    >
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--border-col)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold text-[var(--text-primary)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function BIKpi({
  label,
  value,
  detail,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  delta?: number | null;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "border-[var(--border-col)]",
    accent: "border-[#73d9cb]/35 bg-[#73d9cb]/6",
    success: "border-[#C8F34D]/30 bg-[#C8F34D]/6",
    warning: "border-[#e6c071]/35 bg-[#e6c071]/7",
    danger: "border-[#ef8e78]/35 bg-[#ef8e78]/7",
  };
  const deltaClass =
    delta === undefined || delta === null
      ? "text-[var(--text-secondary)]"
      : delta >= 0
        ? "text-[#2aa99a] dark:text-[#73d9cb]"
        : "text-[#d45f51] dark:text-[#ef8e78]";

  return (
    <article
      className={`min-w-0 rounded-xl border bg-[var(--bg-panel)] px-3.5 py-3 shadow-[var(--shadow-panel)] ${tones[tone]}`}
    >
      <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        {label}
      </p>
      <strong className="mt-1 block truncate text-xl font-black tracking-tight text-[var(--text-primary)]">
        {value}
      </strong>
      {(detail || delta !== undefined) && (
        <p className={`mt-1 truncate text-[10px] font-semibold ${deltaClass}`}>
          {delta !== undefined && delta !== null
            ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`
            : detail}
          {delta !== undefined && delta !== null && detail ? ` · ${detail}` : ""}
        </p>
      )}
    </article>
  );
}

export function BITabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <nav className="flex min-w-max gap-1 rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)] p-1 shadow-[var(--shadow-panel)]">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-2 text-[11px] font-extrabold transition ${
            value === item.id
              ? "bg-[#73d9cb]/16 text-[var(--accent)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-soft)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function BIBarList({
  items,
  formatValue,
  limit = 8,
  color = "#1478ff",
}: {
  items: Array<{ label: string; value: number; detail?: string }>;
  formatValue: (value: number) => string;
  limit?: number;
  color?: string;
}) {
  const rows = items.slice(0, limit);
  const max = Math.max(...rows.map((item) => item.value), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(90px,0.9fr)_2fr] items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="truncate text-[10px] font-semibold text-[var(--text-secondary)]">
              {item.label}
            </p>
            {item.detail && (
              <p className="truncate text-[9px] text-[var(--text-secondary)]/70">
                {item.detail}
              </p>
            )}
          </div>
          <div className="relative h-6 overflow-hidden rounded bg-[var(--bg-panel-soft)]">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${Math.max((item.value / max) * 100, 2)}%`,
                backgroundColor: color,
              }}
            />
            <span className="absolute inset-0 flex items-center justify-end px-2 text-[10px] font-extrabold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
              {formatValue(item.value)}
            </span>
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="py-8 text-center text-xs text-[var(--text-secondary)]">
          Sem dados para este recorte
        </p>
      )}
    </div>
  );
}

export function BIDataTable({
  columns,
  rows,
  empty = "Sem dados para exibir",
}: {
  columns: Array<{
    key: string;
    label: string;
    align?: "left" | "right";
    className?: string;
  }>;
  rows: Array<Record<string, ReactNode>>;
  empty?: string;
}) {
  return (
    <div className="max-h-[430px] overflow-auto">
      <table className="w-full min-w-[760px] border-collapse text-[11px]">
        <thead className="sticky top-0 z-10 bg-[var(--bg-panel-soft)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`border-b border-[var(--border-col)] px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)] ${
                  column.align === "right" ? "text-right" : "text-left"
                } ${column.className ?? ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(row.id ?? index)}
              className="border-b border-[var(--border-col)]/65 hover:bg-[#73d9cb]/5"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2 ${
                    column.align === "right" ? "text-right tabular-nums" : "text-left"
                  } ${column.className ?? ""}`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-xs text-[var(--text-secondary)]"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function BIBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  const tones = {
    neutral: "border-[var(--border-col)] bg-[var(--bg-panel-soft)] text-[var(--text-secondary)]",
    success: "border-[#C8F34D]/30 bg-[#C8F34D]/10 text-[#5e7f00] dark:text-[#C8F34D]",
    warning: "border-[#e6c071]/30 bg-[#e6c071]/10 text-[#9a6813] dark:text-[#e6c071]",
    danger: "border-[#ef8e78]/30 bg-[#ef8e78]/10 text-[#bd4438] dark:text-[#ef8e78]",
    accent: "border-[#73d9cb]/30 bg-[#73d9cb]/10 text-[var(--accent)]",
  };
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${tones[tone]}`}>
      {children}
    </span>
  );
}
