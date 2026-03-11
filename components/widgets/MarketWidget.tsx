"use client";

import useSWR from "swr";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { LightweightChart } from "@/components/ui/LightweightChart";
import { formatNumber } from "@/lib/formatters";
import { useTheme } from "@/lib/theme";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IndexData {
  short: string;
  label: string;
  price: number | null;
  change: number;
  changePct: number;
  history: { date: string; value: number }[];
}

export function MarketWidget() {
  const { data, error, isLoading } = useSWR("/api/market", fetcher, { refreshInterval: 300_000 });
  const [selected, setSelected] = useState("SPX");
  const { theme } = useTheme();

  if (isLoading) return <LoadingCard title="글로벌 증시" />;
  if (error || data?.error) return <ErrorCard title="글로벌 증시" />;

  const indices: IndexData[] = data?.indices ?? [];
  const active = indices.find((i) => i.short === selected) ?? indices[0];

  const chartData = (active?.history ?? []).map((h: { date: string; value: number }) => ({
    time: h.date,
    value: h.value,
  }));

  return (
    <Card title="글로벌 증시">
      <div className="flex gap-1">
        {indices.map((idx) => (
          <button
            key={idx.short}
            onClick={() => setSelected(idx.short)}
            className={`flex-1 py-2 px-2 rounded-lg text-center transition-colors ${
              selected === idx.short
                ? "bg-[var(--bg-card-hover)] ring-1 ring-[var(--border)]"
                : "hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            <div className="text-[10px] text-[var(--text-faint)]">{idx.short}</div>
            <div className="text-sm font-mono font-bold text-[var(--text-primary)]">
              {idx.price !== null ? formatNumber(idx.price, 0) : "—"}
            </div>
            <ChangeIndicator value={idx.changePct} size="xs" />
          </button>
        ))}
      </div>

      {chartData.length > 0 && (
        <LightweightChart
          data={chartData}
          height={160}
          color={active?.changePct >= 0 ? "#3b82f6" : "#ef4444"}
          theme={theme}
        />
      )}
    </Card>
  );
}
