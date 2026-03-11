"use client";

import useSWR from "swr";
import clsx from "clsx";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Ticker {
  label: string;
  value: string;
  change: number | null;
  sub?: string;
}

export function OverviewStrip() {
  const { data: market } = useSWR("/api/market", fetcher, { refreshInterval: 300_000 });
  const { data: crypto } = useSWR("/api/crypto", fetcher, { refreshInterval: 60_000 });

  const tickers: Ticker[] = [];

  // Market indices
  for (const idx of market?.indices ?? []) {
    if (idx.price === null) continue;
    tickers.push({
      label: idx.short,
      value: idx.price.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      change: idx.changePct,
    });
  }

  // Crypto
  for (const coin of crypto?.coins ?? []) {
    tickers.push({
      label: coin.symbol,
      value: "$" + (coin.priceUsd >= 1000
        ? coin.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })
        : coin.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })),
      change: coin.change24h,
      sub: coin.priceKrw
        ? (coin.priceKrw >= 100_000_000
          ? (coin.priceKrw / 100_000_000).toFixed(1) + "억"
          : (coin.priceKrw / 10_000).toFixed(0) + "만") + "원"
        : undefined,
    });
  }

  if (tickers.length === 0) {
    return (
      <div className="bg-gray-900/50 border-b border-gray-800 py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="h-3 w-10 bg-gray-800 rounded" />
                <div className="h-4 w-16 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border-b border-gray-800 py-2.5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-5 overflow-x-auto scrollbar-hide">
          {tickers.map((t) => (
            <div key={t.label} className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 font-medium">{t.label}</span>
              <span className="text-sm text-white font-mono font-semibold">{t.value}</span>
              {t.sub && <span className="text-xs text-gray-500">{t.sub}</span>}
              {t.change !== null && (
                <span
                  className={clsx(
                    "text-xs font-medium",
                    t.change > 0 ? "text-emerald-400" : t.change < 0 ? "text-red-400" : "text-gray-400"
                  )}
                >
                  {t.change > 0 ? "+" : ""}{t.change.toFixed(2)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
