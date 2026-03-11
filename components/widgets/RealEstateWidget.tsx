"use client";

import useSWR from "swr";
import clsx from "clsx";
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RegionData {
  region: string;
  avgPricePerM2: number;
  yoyChange: number;
}

export function RealEstateWidget() {
  const { data, error, isLoading } = useSWR("/api/realestate", fetcher, {
    refreshInterval: 3_600_000,
  });

  if (isLoading) return <LoadingCard title="부동산" />;
  if (error) return <ErrorCard title="부동산" />;

  const regions: RegionData[] = data?.regions ?? [];

  return (
    <Card title="아파트 매매가" subtitle="만원/m² · 정적 스냅샷">
      {data?.note && (
        <div className="text-xs text-amber-400/80 bg-amber-900/10 rounded px-2 py-1.5">
          {data.note}
        </div>
      )}

      {/* Compact table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-gray-500 uppercase">
              <th className="text-left py-1 px-2 font-medium">지역</th>
              <th className="text-right py-1 px-2 font-medium">평균가</th>
              <th className="text-right py-1 px-2 font-medium">YoY</th>
              <th className="text-left py-1 px-2 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.region} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-1.5 px-2 text-white font-medium">{r.region}</td>
                <td className="py-1.5 px-2 text-right font-mono text-gray-300">
                  {r.avgPricePerM2.toLocaleString()}
                </td>
                <td
                  className={clsx(
                    "py-1.5 px-2 text-right font-mono text-xs",
                    r.yoyChange > 0 ? "text-emerald-400" : r.yoyChange < 0 ? "text-red-400" : "text-gray-400"
                  )}
                >
                  {r.yoyChange > 0 ? "+" : ""}{r.yoyChange}%
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center">
                    <div
                      className={clsx(
                        "h-1.5 rounded-full",
                        r.yoyChange > 0 ? "bg-emerald-400/60" : r.yoyChange < 0 ? "bg-red-400/60" : "bg-gray-600"
                      )}
                      style={{ width: `${Math.min(Math.abs(r.yoyChange) * 20, 100)}%` }}
                    />
                  </div>
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
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
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
