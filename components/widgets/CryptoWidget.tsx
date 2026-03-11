"use client";

import useSWR from "swr";
import { Card, ChangeIndicator, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { LightweightChart } from "@/components/ui/LightweightChart";
import { formatPrice } from "@/lib/formatters";
import { useTheme } from "@/lib/theme";
import { useState } from "react";

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
  const { data, error, isLoading } = useSWR("/api/crypto", fetcher, { refreshInterval: 60_000 });
  const [selected, setSelected] = useState("bitcoin");
  const { theme } = useTheme();

  if (isLoading) return <LoadingCard title="암호화폐" />;
  if (error || data?.error) return <ErrorCard title="암호화폐" />;

  const coins: Coin[] = data?.coins ?? [];
  const active = coins.find((c) => c.id === selected) ?? coins[0];

  // Convert sparkline to chart data (7 days, ~168 data points)
  const now = Date.now();
  const sparkChartData = (active?.sparkline ?? [])
    .filter((_, i) => i % 3 === 0)
    .map((v, i, arr) => {
      const msAgo = (arr.length - i) * 3 * 3600_000; // ~3 hours per point after filter
      const d = new Date(now - msAgo);
      return {
        time: d.toISOString().split("T")[0],
        value: v,
      };
    })
    // Deduplicate by date (keep last)
    .reduce<{ time: string; value: number }[]>((acc, item) => {
      const existing = acc.findIndex((a) => a.time === item.time);
      if (existing >= 0) acc[existing] = item;
      else acc.push(item);
      return acc;
    }, []);

  return (
    <Card title="암호화폐">
      {/* Coin selector */}
      <div className="flex gap-2">
        {coins.map((coin) => (
          <button
            key={coin.id}
            onClick={() => setSelected(coin.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-colors ${
              selected === coin.id
                ? "bg-[var(--bg-card-hover)] ring-1 ring-[var(--border)]"
                : "hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)]">{coin.symbol}</div>
              <div className="text-[10px] text-[var(--text-faint)] truncate">
                {formatPrice(coin.priceUsd, "USD")}
              </div>
            </div>
            <ChangeIndicator value={coin.change24h} size="xs" />
          </button>
        ))}
      </div>

      {/* Active coin detail */}
      {active && (
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
              {formatPrice(active.priceUsd, "USD")}
            </div>
            {active.priceKrw && (
              <div className="text-xs text-[var(--text-muted)] font-mono">{formatKrw(active.priceKrw)}</div>
            )}
          </div>
          <div className="flex gap-3 text-xs">
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-faint)]">24h</div>
              <ChangeIndicator value={active.change24h} size="xs" />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-faint)]">7d</div>
              <ChangeIndicator value={active.change7d} size="xs" />
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {sparkChartData.length > 2 && (
        <LightweightChart
          data={sparkChartData}
          height={120}
          color={active?.change7d >= 0 ? "#34d399" : "#f87171"}
          type="line"
          theme={theme}
        />
      )}
    </Card>
  );
}
