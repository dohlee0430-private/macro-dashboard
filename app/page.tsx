"use client";

import { OverviewStrip } from "@/components/widgets/OverviewStrip";
import { MarketWidget } from "@/components/widgets/MarketWidget";
import { CryptoWidget } from "@/components/widgets/CryptoWidget";
import { M2Widget } from "@/components/widgets/M2Widget";
import { PolicyWidget } from "@/components/widgets/PolicyWidget";
import { RealEstateWidget } from "@/components/widgets/RealEstateWidget";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-base font-bold text-white">매크로 대시보드</h1>
          </div>
          <span className="text-[10px] text-gray-600">🇺🇸 US · 🇰🇷 KR</span>
        </div>
      </header>

      {/* Ticker strip */}
      <OverviewStrip />

      {/* Dashboard grid */}
      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* Row 1: Markets + Crypto */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <MarketWidget />
          </div>
          <div className="lg:col-span-2">
            <CryptoWidget />
          </div>
        </section>

        {/* Row 2: M2 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <M2Widget endpoint="/api/m2" title="미국 M2 통화량" color="#3b82f6" />
          <M2Widget endpoint="/api/korea-m2" title="한국 M2 통화량" color="#f59e0b" />
        </section>

        {/* Row 3: Policy + Real Estate */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <PolicyWidget />
          </div>
          <div className="lg:col-span-2">
            <RealEstateWidget />
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 mt-4 py-3 text-center text-[10px] text-gray-600">
        데이터: CoinGecko · Yahoo Finance · FRED · 한국은행 · 한국부동산원
        &nbsp;|&nbsp; 투자 조언이 아닙니다
      </footer>
    </div>
  );
}
