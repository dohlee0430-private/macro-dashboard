"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  YAxis,
} from "recharts";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { formatPrice, formatLargeNumber, formatPct, relativeTime } from "@/lib/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Coin {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceKrw: number | null;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  sparkline: number[];
  image: string;
}

export function CryptoWidget() {
  const { data, error, isLoading } = useSWR("/api/crypto", fetcher, {
    refreshInterval: 60_000,
  });

  if (isLoading) return <LoadingCard title="암호화폐" />;
  if (error || data?.error) return <ErrorCard title="암호화폐" />;

  return (
    <Card
      title="암호화폐"
      subtitle={data.updatedAt ? relativeTime(data.updatedAt) + " 업데이트" : undefined}
    >
      <div className="flex flex-col gap-4">
        {data.coins?.map((coin: Coin) => (
          <CoinRow key={coin.id} coin={coin} />
        ))}
      </div>
    </Card>
  );
}

function CoinRow({ coin }: { coin: Coin }) {
  const sparkData = coin.sparkline.map((v, i) => ({ i, v }));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
          <span className="font-bold text-white">{coin.symbol}</span>
          <span className="text-xs text-gray-500">{coin.name}</span>
        </div>
        <div className="text-right">
          <div className="text-white font-mono font-semibold">
            {formatPrice(coin.priceUsd, "USD")}
          </div>
          {coin.priceKrw && (
            <div className="text-xs text-gray-400">
              ₩{(coin.priceKrw / 1_000_000).toFixed(2)}M
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="text-gray-500">24h</span>
          <ChangeIndicator value={coin.change24h} />
          <span className="text-gray-500">7d</span>
          <ChangeIndicator value={coin.change7d} />
        </div>
        <div className="text-xs text-gray-500">
          Vol {formatLargeNumber(coin.volume24h)}
        </div>
      </div>

      {sparkData.length > 0 && (
        <div className="h-12 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                      {formatPrice(payload[0].value as number, "USD")}
                    </div>
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="v"
                dot={false}
                strokeWidth={1.5}
                stroke={coin.change7d >= 0 ? "#34d399" : "#f87171"}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="text-xs text-gray-600">
        MCap {formatLargeNumber(coin.marketCap)} | 7일 스파크라인
      </div>
    </div>
  );
}

// Suppress unused import warning
void formatPct;
