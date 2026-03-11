"use client";

import useSWR from "swr";
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { LightweightChart } from "@/components/ui/LightweightChart";
import { useTheme } from "@/lib/theme";
import { formatDate } from "@/lib/formatters";
import clsx from "clsx";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChartView = "spread" | "gold" | "vix";

export function IndicatorsWidget() {
  const { data, error, isLoading } = useSWR("/api/indicators", fetcher, { refreshInterval: 300_000 });
  const { theme } = useTheme();
  const [chartView, setChartView] = useState<ChartView>("spread");

  if (isLoading) return <LoadingCard title="미국 경제지표" />;
  if (error || data?.error) return <ErrorCard title="미국 경제지표" />;

  const { gold, vix, treasurySpread, cpi, unemployment, hasFredKey } = data;

  const VIX_COLORS: Record<string, string> = {
    low: "text-emerald-500",
    normal: "text-blue-500",
    high: "text-amber-500",
    extreme: "text-red-500",
  };
  const VIX_LABELS: Record<string, string> = {
    low: "안정",
    normal: "보통",
    high: "경계",
    extreme: "공포",
  };

  // Chart data based on selected view
  const chartData =
    chartView === "spread"
      ? (treasurySpread?.history ?? []).map((h: { date: string; value: number }) => ({ time: h.date, value: h.value }))
      : chartView === "gold"
        ? (gold?.history ?? []).map((h: { date: string; value: number }) => ({ time: h.date, value: h.value }))
        : (vix?.history ?? []).map((h: { date: string; value: number }) => ({ time: h.date, value: h.value }));

  const chartColor =
    chartView === "spread"
      ? treasurySpread?.inverted ? "#ef4444" : "#3b82f6"
      : chartView === "gold"
        ? "#eab308"
        : "#f97316";

  return (
    <Card title="미국 경제지표">
      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Gold */}
        <MetricBox
          label="금 (Gold)"
          value={gold ? `$${gold.price?.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
          sub={gold ? `${gold.changePct > 0 ? "+" : ""}${gold.changePct}%` : undefined}
          subColor={gold?.changePct > 0 ? "text-emerald-500" : gold?.changePct < 0 ? "text-red-500" : undefined}
        />

        {/* VIX */}
        <MetricBox
          label="VIX 공포지수"
          value={vix ? vix.value?.toFixed(2) : "—"}
          sub={vix ? VIX_LABELS[vix.level] : undefined}
          subColor={vix ? VIX_COLORS[vix.level] : undefined}
        />

        {/* Treasury Spread */}
        <MetricBox
          label={`국채 스프레드 ${treasurySpread?.label ?? ""}`}
          value={treasurySpread?.value !== null ? `${treasurySpread.value > 0 ? "+" : ""}${treasurySpread.value}%p` : "—"}
          sub={treasurySpread?.inverted ? "역전 (경기침체 신호)" : "정상"}
          subColor={treasurySpread?.inverted ? "text-red-500" : "text-emerald-500"}
        />

        {/* CPI */}
        <MetricBox
          label="CPI (소비자물가)"
          value={cpi ? `${cpi.yoyChange?.toFixed(1)}%` : "—"}
          sub={cpi ? `${formatDate(cpi.date)} 기준 YoY` : hasFredKey ? "데이터 없음" : "FRED 키 필요"}
          subColor={cpi?.yoyChange > 3 ? "text-red-500" : cpi?.yoyChange > 2 ? "text-amber-500" : "text-emerald-500"}
        />

        {/* Unemployment */}
        <MetricBox
          label="실업률"
          value={unemployment ? `${unemployment.value}%` : "—"}
          sub={
            unemployment
              ? `${unemployment.change > 0 ? "▲" : unemployment.change < 0 ? "▼" : "—"}${Math.abs(unemployment.change ?? 0).toFixed(1)}%p MoM`
              : hasFredKey ? "데이터 없음" : "FRED 키 필요"
          }
          subColor={unemployment?.change > 0 ? "text-red-500" : unemployment?.change < 0 ? "text-emerald-500" : undefined}
        />
      </div>

      {/* Chart selector */}
      <div className="flex gap-1">
        {([
          { key: "spread" as const, label: "국채 스프레드" },
          { key: "gold" as const, label: "금 시세" },
          { key: "vix" as const, label: "VIX" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setChartView(tab.key)}
            className={clsx(
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              chartView === tab.key
                ? "bg-[var(--bg-card-hover)] text-[var(--text-primary)]"
                : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 2 && (
        <LightweightChart
          data={chartData}
          height={130}
          color={chartColor}
          theme={theme}
        />
      )}

      {!hasFredKey && (
        <div className="text-[10px] text-amber-500/80 bg-amber-500/10 rounded px-2 py-1">
          FRED_API_KEY 설정 시 CPI·실업률·정확한 10Y-2Y 스프레드 표시
        </div>
      )}
    </Card>
  );
}

function MetricBox({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-[var(--bg-card-hover)] rounded-lg px-3 py-2">
      <div className="text-[10px] text-[var(--text-faint)] truncate">{label}</div>
      <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">{value}</div>
      {sub && (
        <div className={clsx("text-[10px] font-medium mt-0.5", subColor ?? "text-[var(--text-faint)]")}>
          {sub}
        </div>
      )}
    </div>
  );
}
