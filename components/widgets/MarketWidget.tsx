"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { formatNumber } from "@/lib/formatters";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IndexData {
  symbol: string;
  label: string;
  short: string;
  price: number | null;
  change: number;
  changePct: number;
  history: { date: string; value: number }[];
}

export function MarketWidget() {
  const { data, error, isLoading } = useSWR("/api/market", fetcher, {
    refreshInterval: 300_000,
  });
  const [selected, setSelected] = useState<string>("SPX");

  if (isLoading) return <LoadingCard title="글로벌 증시" />;
  if (error || data?.error) return <ErrorCard title="글로벌 증시" />;

  const indices: IndexData[] = data?.indices ?? [];
  const active = indices.find((i) => i.short === selected) ?? indices[0];

  return (
    <Card title="글로벌 증시">
      {/* Index selector + price */}
      <div className="flex gap-1">
        {indices.map((idx) => (
          <button
            key={idx.short}
            onClick={() => setSelected(idx.short)}
            className={`flex-1 py-2 px-2 rounded-lg text-center transition-colors ${
              selected === idx.short
                ? "bg-gray-800 ring-1 ring-gray-700"
                : "hover:bg-gray-800/50"
            }`}
          >
            <div className="text-[10px] text-gray-500">{idx.short}</div>
            <div className="text-sm font-mono font-bold text-white">
              {idx.price !== null ? formatNumber(idx.price, 0) : "—"}
            </div>
            <ChangeIndicator value={idx.changePct} />
          </button>
        ))}
      </div>

      {/* Chart */}
      {active?.history?.length > 0 && (
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={active.history}>
              <defs>
                <linearGradient id={`grad-${active.short}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={active.changePct >= 0 ? "#3b82f6" : "#ef4444"}
                    stopOpacity={0.2}
                  />
                  <stop offset="100%" stopColor="#030712" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#4b5563" }}
                tickFormatter={(v) => v.slice(5)}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#4b5563" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatNumber(v, 0)}
                width={48}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatNumber(v, 2), active.label]}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={active.changePct >= 0 ? "#3b82f6" : "#ef4444"}
                fill={`url(#grad-${active.short})`}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
