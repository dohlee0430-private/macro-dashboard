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
  const { data: forex } = useSWR("/api/forex", fetcher, { refreshInterval: 300_000 });
  const { data: indicators } = useSWR("/api/indicators", fetcher, { refreshInterval: 300_000 });

  const tickers: Ticker[] = [];

  for (const idx of market?.indices ?? []) {
    if (idx.price === null) continue;
    tickers.push({
      label: idx.short,
      value: idx.price.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      change: idx.changePct,
    });
  }

  if (forex?.rate) {
    tickers.push({
      label: "USD/KRW",
      value: "₩" + forex.rate.toLocaleString("ko-KR"),
      change: forex.changePct,
    });
  }

  // Gold
  if (indicators?.gold?.price) {
    tickers.push({
      label: "GOLD",
      value: "$" + indicators.gold.price.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      change: indicators.gold.changePct,
    });
  }

  // VIX
  if (indicators?.vix?.value) {
    tickers.push({
      label: "VIX",
      value: indicators.vix.value.toFixed(1),
      change: indicators.vix.changePct,
    });
  }

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
      <div className="bg-[var(--bg-card)]/50 border-b border-[var(--border)] py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="h-3 w-10 bg-[var(--border)] rounded" />
                <div className="h-4 w-16 bg-[var(--border)] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)]/50 border-b border-[var(--border)] py-2">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {tickers.map((t, i) => (
            <div key={t.label} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <div className="w-px h-3 bg-[var(--border)] -ml-1 mr-0.5" />}
              <span className="text-[10px] text-[var(--text-faint)] font-medium">{t.label}</span>
              <span className="text-xs text-[var(--text-primary)] font-mono font-semibold">{t.value}</span>
              {t.sub && <span className="text-[10px] text-[var(--text-faint)]">{t.sub}</span>}
              {t.change !== null && (
                <span
                  className={clsx(
                    "text-[10px] font-mono font-medium",
                    t.change > 0 ? "text-emerald-500" : t.change < 0 ? "text-red-500" : "text-[var(--text-faint)]"
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
