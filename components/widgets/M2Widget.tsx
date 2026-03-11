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
import { formatNumber, formatDate } from "@/lib/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface M2Data {
  series: { date: string; value: number }[];
  latest: number | null;
  latestDate: string | null;
  momChange: number | null;
  yoyChange: number | null;
  unit: string;
  updatedAt: string;
  error?: string;
}

export function M2Widget({
  endpoint,
  title,
  color,
}: {
  endpoint: "/api/m2" | "/api/korea-m2";
  title: string;
  color: string;
}) {
  const { data, error, isLoading } = useSWR<M2Data>(endpoint, fetcher, {
    refreshInterval: 3_600_000,
  });

  if (isLoading) return <LoadingCard title={title} />;

  if (error || data?.error) {
    const msg = data?.error?.includes("not configured")
      ? `API 키 미설정 — ${endpoint === "/api/m2" ? "FRED_API_KEY" : "BOK_API_KEY"}`
      : undefined;
    return <ErrorCard title={title} message={msg} />;
  }

  if (!data) return null;

  const series = data.series.slice(-36);

  return (
    <Card
      title={title}
      subtitle={data.latestDate ? formatDate(data.latestDate) + " 기준" : undefined}
    >
      {/* Key metric */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white font-mono">
            {data.latest !== null ? formatNumber(data.latest, 0) : "—"}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{data.unit}</div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-[10px] text-gray-500">MoM</div>
            <ChangeIndicator value={data.momChange} />
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500">YoY</div>
            <ChangeIndicator value={data.yoyChange} />
          </div>
        </div>
      </div>

      {/* Chart */}
      {series.length > 0 && (
        <div className="h-32 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id={`m2-${endpoint}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#030712" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#4b5563" }}
                tickFormatter={(v) => v.slice(0, 7)}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#4b5563" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatNumber(v, 0)}
                width={52}
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
                formatter={(v: number) => [formatNumber(v, 0), title]}
                labelFormatter={(l) => formatDate(l as string)}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#m2-${endpoint})`}
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
