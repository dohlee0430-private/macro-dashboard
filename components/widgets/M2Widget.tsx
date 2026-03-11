"use client";

import useSWR from "swr";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { LightweightChart } from "@/components/ui/LightweightChart";
import { formatNumber, formatDate } from "@/lib/formatters";
import { useTheme } from "@/lib/theme";

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
  const { data, error, isLoading } = useSWR<M2Data>(endpoint, fetcher, { refreshInterval: 3_600_000 });
  const { theme } = useTheme();

  if (isLoading) return <LoadingCard title={title} />;

  if (error || data?.error) {
    const msg = data?.error?.includes("not configured")
      ? `API 키 미설정 — ${endpoint === "/api/m2" ? "FRED_API_KEY" : "BOK_API_KEY"}`
      : undefined;
    return <ErrorCard title={title} message={msg} />;
  }

  if (!data) return null;

  const chartData = data.series.slice(-36).map((d) => ({ time: d.date, value: d.value }));

  return (
    <Card title={title} subtitle={data.latestDate ? formatDate(data.latestDate) + " 기준" : undefined}>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            {data.latest !== null ? formatNumber(data.latest, 0) : "—"}
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{data.unit}</div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-[10px] text-[var(--text-faint)]">MoM</div>
            <ChangeIndicator value={data.momChange} />
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[var(--text-faint)]">YoY</div>
            <ChangeIndicator value={data.yoyChange} />
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <LightweightChart data={chartData} height={130} color={color} theme={theme} />
      )}
    </Card>
  );
}
