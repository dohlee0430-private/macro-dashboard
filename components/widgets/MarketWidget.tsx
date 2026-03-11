"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { formatNumber, relativeTime } from "@/lib/formatters";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IndexData {
  symbol: string;
  label: string;
  short: string;
  price: number | null;
  previousClose: number;
  change: number;
  changePct: number;
  currency: string;
  error?: boolean;
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
    <Card
      title="글로벌 증시"
      subtitle={data.updatedAt ? relativeTime(data.updatedAt) + " 업데이트" : undefined}
    >
      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {indices.map((idx) => (
          <button
            key={idx.short}
            onClick={() => setSelected(idx.short)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selected === idx.short
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {idx.short}
          </button>
        ))}
      </div>

      {active && (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-gray-500">{active.label}</div>
              <div className="text-2xl font-bold text-white font-mono">
                {active.price !== null ? formatNumber(active.price, 2) : "—"}
              </div>
            </div>
            <div className="text-right">
              <ChangeIndicator value={active.changePct} />
              <div className="text-xs text-gray-500 mt-0.5">
                {active.change > 0 ? "+" : ""}
                {formatNumber(active.change, 2)} pt
              </div>
            </div>
          </div>

          {active.history.length > 0 && (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={active.history}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={active.changePct >= 0 ? "#3b82f6" : "#ef4444"}
                        stopOpacity={0.3}
                      />
                      <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v) => v.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => formatNumber(v, 0)}
                    width={55}
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
                    fill="url(#grad)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
