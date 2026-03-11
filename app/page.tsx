"use client";

import { OverviewStrip } from "@/components/widgets/OverviewStrip";
import { MarketWidget } from "@/components/widgets/MarketWidget";
import { CryptoWidget } from "@/components/widgets/CryptoWidget";
import { ForexWidget } from "@/components/widgets/ForexWidget";
import { M2Widget } from "@/components/widgets/M2Widget";
import { PolicyWidget } from "@/components/widgets/PolicyWidget";
import { RealEstateWidget } from "@/components/widgets/RealEstateWidget";
import { IndicatorsWidget } from "@/components/widgets/IndicatorsWidget";
import { useTheme } from "@/lib/theme";

export default function DashboardPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base font-bold text-[var(--text-primary)]">매크로 대시보드</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-faint)]">🇺🇸 US · 🇰🇷 KR</span>
            <button
              onClick={toggle}
              className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-sm hover:bg-[var(--bg-card-hover)] transition-colors"
              aria-label="테마 전환"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Ticker strip */}
      <OverviewStrip />

      {/* Dashboard grid */}
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Row 1: Markets + Crypto + Forex */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <MarketWidget />
          </div>
          <div className="lg:col-span-4">
            <CryptoWidget />
          </div>
          <div className="lg:col-span-3">
            <ForexWidget />
          </div>
        </section>

        {/* Row 2: US Indicators */}
        <section>
          <IndicatorsWidget />
        </section>

        {/* Row 3: M2 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <M2Widget endpoint="/api/m2" title="미국 M2 통화량" color="#3b82f6" />
          <M2Widget endpoint="/api/korea-m2" title="한국 M2 통화량" color="#f59e0b" />
        </section>

        {/* Row 3: Policy + Real Estate */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PolicyWidget />
          <RealEstateWidget />
        </section>
      </main>

      <footer className="border-t border-[var(--border)] mt-4 py-3 text-center text-[10px] text-[var(--text-faint)]">
        데이터: CoinGecko · Yahoo Finance · FRED · 한국은행 · 한국부동산원
        &nbsp;|&nbsp; 투자 조언이 아닙니다
      </footer>
    </div>
  );
}
