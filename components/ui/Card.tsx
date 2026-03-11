"use client";

import clsx from "clsx";
import { ReactNode } from "react";

interface CardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
}

export function Card({ title, subtitle, children, className, badge }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-faint)] mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

export function ChangeIndicator({
  value,
  suffix = "%",
  size = "sm",
}: {
  value: number | null;
  suffix?: string;
  size?: "xs" | "sm";
}) {
  if (value === null || value === undefined) return <span className="text-[var(--text-faint)]">—</span>;
  const positive = value > 0;
  const zero = value === 0;
  return (
    <span
      className={clsx(
        "font-medium font-mono",
        size === "xs" ? "text-xs" : "text-sm",
        zero ? "text-[var(--text-faint)]" : positive ? "text-emerald-500" : "text-red-500"
      )}
    >
      {positive ? "+" : ""}{value.toFixed(2)}{suffix}
    </span>
  );
}

export function LoadingCard({ title }: { title: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-3 animate-pulse">
      <h2 className="text-sm font-semibold text-[var(--text-faint)] uppercase tracking-wider">{title}</h2>
      <div className="h-8 bg-[var(--border)] rounded w-2/3" />
      <div className="h-4 bg-[var(--border)] rounded w-1/2" />
      <div className="h-24 bg-[var(--border)] rounded" />
    </div>
  );
}

export function ErrorCard({ title, message }: { title: string; message?: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-red-500/30 rounded-xl p-5 flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">{title}</h2>
      <p className="text-sm text-red-500">{message ?? "데이터를 불러오지 못했습니다"}</p>
    </div>
  );
}
