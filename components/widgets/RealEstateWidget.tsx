"use client";

import useSWR from "swr";
import clsx from "clsx";
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RegionData {
  region: string;
  avgPricePerM2: number;
  jeonseRatio: number;
  txCount: number;
  weekChange: number;
  yoyChange: number;
}

function pct(v: number): string {
  return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
}

function pctColor(v: number): string {
  if (v > 0) return "text-emerald-500";
  if (v < 0) return "text-red-500";
  return "text-[var(--text-faint)]";
}

export function RealEstateWidget() {
  const { data, error, isLoading } = useSWR("/api/realestate", fetcher, { refreshInterval: 3_600_000 });

  if (isLoading) return <LoadingCard title="부동산" />;
  if (error) return <ErrorCard title="부동산" />;

  const regions: RegionData[] = data?.regions ?? [];

  return (
    <Card title="아파트 시세" subtitle="정적 스냅샷 · 만원/m²">
      {data?.note && (
        <div className="text-[10px] text-amber-500/80 bg-amber-500/10 rounded px-2 py-1">
          {data.note}
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-[var(--text-faint)] uppercase border-b border-[var(--border)]">
              <th className="text-left py-1.5 px-1.5 font-medium">지역</th>
              <th className="text-right py-1.5 px-1.5 font-medium">매매가</th>
              <th className="text-right py-1.5 px-1.5 font-medium">전세가율</th>
              <th className="text-right py-1.5 px-1.5 font-medium">거래량</th>
              <th className="text-right py-1.5 px-1.5 font-medium">주간</th>
              <th className="text-right py-1.5 px-1.5 font-medium">YoY</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.region} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-card-hover)]">
                <td className="py-1.5 px-1.5 text-[var(--text-primary)] font-medium whitespace-nowrap">{r.region}</td>
                <td className="py-1.5 px-1.5 text-right font-mono text-[var(--text-secondary)]">
                  {r.avgPricePerM2.toLocaleString()}
                </td>
                <td className="py-1.5 px-1.5 text-right font-mono text-[var(--text-muted)]">
                  {r.jeonseRatio}%
                </td>
                <td className="py-1.5 px-1.5 text-right font-mono text-[var(--text-muted)]">
                  {r.txCount.toLocaleString()}
                </td>
                <td className={clsx("py-1.5 px-1.5 text-right font-mono", pctColor(r.weekChange))}>
                  {pct(r.weekChange)}
                </td>
                <td className={clsx("py-1.5 px-1.5 text-right font-mono", pctColor(r.yoyChange))}>
                  {pct(r.yoyChange)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.sources && (
        <div className="text-[10px] text-[var(--text-faint)] pt-1">
          출처:{" "}
          {data.sources.map((s: { url: string; name: string }, i: number) => (
            <span key={i}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">{s.name}</a>
              {i < data.sources.length - 1 && " · "}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
