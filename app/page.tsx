"use client";

import { CryptoWidget } from "@/components/widgets/CryptoWidget";
import { MarketWidget } from "@/components/widgets/MarketWidget";
import { M2Widget } from "@/components/widgets/M2Widget";
import { RealEstateWidget } from "@/components/widgets/RealEstateWidget";
import { PolicyWidget } from "@/components/widgets/PolicyWidget";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              매크로 대시보드
            </h1>
            <span className="text-xs text-gray-500 hidden sm:inline">
              Macro Economic Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🇺🇸 미국 · 🇰🇷 한국</span>
            <span className="hidden sm:inline">경제지표 실시간 모니터링</span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Row 1: Policy (wide) */}
        <section>
          <PolicyWidget />
        </section>

        {/* Row 2: Markets + Crypto */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MarketWidget />
          <CryptoWidget />
        </section>

        {/* Row 3: M2 charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <M2Widget
            endpoint="/api/m2"
            title="미국 M2 통화량"
            color="#3b82f6"
          />
          <M2Widget
            endpoint="/api/korea-m2"
            title="한국 M2 통화량"
            color="#f59e0b"
          />
        </section>

        {/* Row 4: Real estate */}
        <section>
          <RealEstateWidget />
        </section>
      </main>

      <footer className="border-t border-gray-800 mt-8 py-4 text-center text-xs text-gray-600">
        <p>
          데이터 출처: CoinGecko · Yahoo Finance · FRED (Federal Reserve) · 한국은행 · 한국부동산원
        </p>
        <p className="mt-1">
          본 대시보드는 참고 목적으로 제공되며, 투자 조언이 아닙니다.
        </p>
      </footer>
    </div>
  );
}
