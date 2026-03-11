"use client";

import useSWR from "swr";
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { LightweightChart } from "@/components/ui/LightweightChart";
import { useTheme } from "@/lib/theme";
import clsx from "clsx";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ForexWidget() {
  const { data, error, isLoading } = useSWR("/api/forex", fetcher, { refreshInterval: 300_000 });
  const { theme } = useTheme();

  if (isLoading) return <LoadingCard title="환율" />;
  if (error || data?.error) return <ErrorCard title="환율" />;

  const up = data.change > 0;
  const chartData = (data.history ?? []).map((h: { date: string; value: number }) => ({
    time: h.date,
    value: h.value,
  }));

  return (
    <Card title="USD/KRW 환율">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            ₩{data.rate?.toLocaleString("ko-KR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-0.5">1 USD 기준</div>
        </div>
        <div className="text-right">
          <div
            className={clsx(
              "text-sm font-mono font-medium",
              up ? "text-red-500" : data.change < 0 ? "text-emerald-500" : "text-[var(--text-faint)]"
            )}
          >
            {data.change > 0 ? "+" : ""}{data.change?.toFixed(2)}원
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
            {up ? "원화 약세" : data.change < 0 ? "원화 강세" : "보합"} ({data.changePct > 0 ? "+" : ""}{data.changePct?.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-[var(--text-faint)]">
        <span>6개월 저점 ₩{data.low6m?.toLocaleString()}</span>
        <span>고점 ₩{data.high6m?.toLocaleString()}</span>
      </div>

      {chartData.length > 0 && (
        <LightweightChart
          data={chartData}
          height={110}
          color="#8b5cf6"
          theme={theme}
        />
      )}
    </Card>
  );
}
