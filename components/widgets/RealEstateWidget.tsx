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

function fmtPct(v: number): string {
  return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
}

export function RealEstateWidget() {
  const { data, error, isLoading } = useSWR("/api/realestate", fetcher, {
    refreshInterval: 3_600_000,
  });

  if (isLoading) return <LoadingCard title="부동산" />;
  if (error) return <ErrorCard title="부동산" />;

  const regions: RegionData[] = data?.regions ?? [];

  return (
    <Card title="아파트 시세" subtitle="정적 스냅샷 · 만원/m²">
      {data?.note && (
        <div className="text-[10px] text-amber-400/80 bg-amber-900/10 rounded px-2 py-1">
          {data.note}
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
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
              <tr key={r.region} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                <td className="py-1.5 px-1.5 text-white font-medium whitespace-nowrap">{r.region}</td>
                <td className="py-1.5 px-1.5 text-right font-mono text-gray-300">
                  {r.avgPricePerM2.toLocaleString()}
                </td>
                <td className="py-1.5 px-1.5 text-right font-mono text-gray-400">
                  {r.jeonseRatio}%
                </td>
                <td className="py-1.5 px-1.5 text-right font-mono text-gray-400">
                  {r.txCount.toLocaleString()}
                </td>
                <td
                  className={clsx(
                    "py-1.5 px-1.5 text-right font-mono",
                    r.weekChange > 0 ? "text-emerald-400" : r.weekChange < 0 ? "text-red-400" : "text-gray-500"
                  )}
                >
                  {fmtPct(r.weekChange)}
                </td>
                <td
                  className={clsx(
                    "py-1.5 px-1.5 text-right font-mono",
                    r.yoyChange > 0 ? "text-emerald-400" : r.yoyChange < 0 ? "text-red-400" : "text-gray-500"
                  )}
                >
                  {fmtPct(r.yoyChange)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.sources && (
        <div className="text-[10px] text-gray-600 pt-1">
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
