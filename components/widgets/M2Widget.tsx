"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { formatNumber, formatDate, relativeTime } from "@/lib/formatters";

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
    const isNotConfigured = data?.error?.includes("not configured");
    return (
      <ErrorCard
        title={title}
        message={
          isNotConfigured
            ? `API 키 미설정 — .env 파일에 ${endpoint === "/api/m2" ? "FRED_API_KEY" : "BOK_API_KEY"} 추가 필요`
            : undefined
        }
      />
    );
  }

  if (!data) return null;

  const recentSeries = data.series.slice(-36); // last 3 years

  return (
    <Card
      title={title}
      subtitle={
        data.latestDate
          ? `최신: ${formatDate(data.latestDate)} · ${relativeTime(data.updatedAt)} 업데이트`
          : undefined
      }
    >
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white font-mono">
            {data.latest !== null ? formatNumber(data.latest, 0) : "—"}
          </div>
          <div className="text-xs text-gray-500">{data.unit}</div>
        </div>
        <div className="text-right flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">MoM</span>
            <ChangeIndicator value={data.momChange} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">YoY</span>
            <ChangeIndicator value={data.yoyChange} />
          </div>
        </div>
      </div>

      {recentSeries.length > 0 && (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickFormatter={(v) => v.slice(0, 7)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatNumber(v, 0)}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatNumber(v, 0) + " " + (data.unit.split(" ")[0] ?? ""), title]}
                labelStyle={{ color: "#9ca3af" }}
                labelFormatter={(l) => formatDate(l as string)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
