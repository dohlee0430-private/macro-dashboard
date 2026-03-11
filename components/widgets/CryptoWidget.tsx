"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { formatPrice } from "@/lib/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Coin {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceKrw: number | null;
  change24h: number;
  change7d: number;
  sparkline: number[];
  image: string;
}

function formatKrw(n: number | null): string {
  if (!n) return "";
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(1) + "억원";
  if (n >= 10_000) return Math.round(n / 10_000).toLocaleString() + "만원";
  return n.toLocaleString() + "원";
}

export function CryptoWidget() {
  const { data, error, isLoading } = useSWR("/api/crypto", fetcher, {
    refreshInterval: 60_000,
  });

  if (isLoading) return <LoadingCard title="암호화폐" />;
  if (error || data?.error) return <ErrorCard title="암호화폐" />;

  return (
    <Card title="암호화폐">
      <div className="flex flex-col gap-5">
        {data.coins?.map((coin: Coin) => (
          <CoinRow key={coin.id} coin={coin} />
        ))}
      </div>
    </Card>
  );
}

function CoinRow({ coin }: { coin: Coin }) {
  const sparkData = coin.sparkline
    .filter((_, i) => i % 4 === 0) // downsample for performance
    .map((v, i) => ({ i, v }));

  return (
    <div className="flex flex-col gap-2">
      {/* Header: icon + name + price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coin.image} alt={coin.name} className="w-7 h-7 rounded-full" />
          <div>
            <span className="font-bold text-white text-sm">{coin.symbol}</span>
            <span className="text-xs text-gray-500 ml-1.5">{coin.name}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-mono font-bold text-lg">
            {formatPrice(coin.priceUsd, "USD")}
          </div>
          {coin.priceKrw && (
            <div className="text-xs text-gray-400 font-mono">
              {formatKrw(coin.priceKrw)}
            </div>
          )}
        </div>
      </div>

      {/* Changes + sparkline */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">24h</span>
            <ChangeIndicator value={coin.change24h} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">7d</span>
            <ChangeIndicator value={coin.change7d} />
          </div>
        </div>

        {sparkData.length > 0 && (
          <div className="w-24 h-8">
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
      </div>
    </div>
  );
}
