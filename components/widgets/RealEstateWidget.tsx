"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { relativeTime } from "@/lib/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RegionData {
  region: string;
  avgPricePerM2: number;
  yoyChange: number;
  type: string;
}

export function RealEstateWidget() {
  const { data, error, isLoading } = useSWR("/api/realestate", fetcher, {
    refreshInterval: 3_600_000,
  });

  if (isLoading) return <LoadingCard title="부동산" />;
  if (error) return <ErrorCard title="부동산" />;

  const regions: RegionData[] = data?.regions ?? [];

  return (
    <Card
      title="부동산"
      subtitle={`아파트 매매가 (만원/m²) · ${data?.updatedAt ? relativeTime(data.updatedAt) + " 업데이트" : ""}`}
    >
      {data?.note && (
        <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded px-3 py-2">
          {data.note}
        </div>
      )}

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={regions} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(v) => v.toLocaleString()}
            />
            <YAxis
              type="category"
              dataKey="region"
              tick={{ fontSize: 11, fill: "#d1d5db" }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(v: number, _name, entry) => [
                `${v.toLocaleString()}만원/m² (YoY: ${entry.payload.yoyChange > 0 ? "+" : ""}${entry.payload.yoyChange}%)`,
                "평균 매매가",
              ]}
            />
            <Bar dataKey="avgPricePerM2" radius={[0, 3, 3, 0]}>
              {regions.map((r, i) => (
                <Cell
                  key={i}
                  fill={r.yoyChange >= 0 ? "#3b82f6" : "#ef4444"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* YoY change badges */}
      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <div
            key={r.region}
            className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
              r.yoyChange > 0
                ? "bg-emerald-900/30 text-emerald-400"
                : r.yoyChange < 0
                ? "bg-red-900/30 text-red-400"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            <span>{r.region}</span>
            <span>
              {r.yoyChange > 0 ? "▲" : r.yoyChange < 0 ? "▼" : "—"}
              {Math.abs(r.yoyChange)}%
            </span>
          </div>
        ))}
      </div>

      {data?.sources && (
        <div className="text-xs text-gray-600 border-t border-gray-800 pt-2 mt-1">
          출처:{" "}
          {data.sources.map((s: { url: string; name: string }, i: number) => (
            <span key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {s.name}
              </a>
              {i < data.sources.length - 1 && " · "}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
