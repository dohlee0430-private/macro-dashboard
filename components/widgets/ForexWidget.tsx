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
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";
import clsx from "clsx";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ForexWidget() {
  const { data, error, isLoading } = useSWR("/api/forex", fetcher, {
    refreshInterval: 300_000,
  });

  if (isLoading) return <LoadingCard title="환율" />;
  if (error || data?.error) return <ErrorCard title="환율" />;

  const up = data.change > 0; // 원화 약세 = 숫자 상승

  return (
    <Card title="USD/KRW 환율">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white font-mono">
            ₩{data.rate?.toLocaleString("ko-KR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">1 USD 기준</div>
        </div>
        <div className="text-right">
          <div
            className={clsx(
              "text-sm font-mono font-medium",
              up ? "text-red-400" : data.change < 0 ? "text-emerald-400" : "text-gray-400"
            )}
          >
            {data.change > 0 ? "+" : ""}{data.change?.toFixed(2)}원 ({data.changePct > 0 ? "+" : ""}{data.changePct?.toFixed(2)}%)
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {up ? "원화 약세" : data.change < 0 ? "원화 강세" : "보합"}
          </div>
        </div>
      </div>

      {/* 6m range */}
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>6개월 저점: ₩{data.low6m?.toLocaleString()}</span>
        <span>고점: ₩{data.high6m?.toLocaleString()}</span>
      </div>

      {/* Chart */}
      {data.history?.length > 0 && (
        <div className="h-28 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.history}>
              <defs>
                <linearGradient id="forex-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#030712" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#4b5563" }}
                tickFormatter={(v) => v.slice(5)}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#4b5563" }}
                domain={["auto", "auto"]}
                width={42}
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
                formatter={(v: number) => ["₩" + v.toLocaleString(), "USD/KRW"]}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                fill="url(#forex-grad)"
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
