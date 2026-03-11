"use client";

import useSWR from "swr";
import { Card, LoadingCard, ErrorCard } from "@/components/ui/Card";
import { relativeTime } from "@/lib/formatters";
import { useState } from "react";
import clsx from "clsx";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FeedItem {
  title: string;
  link: string;
  date: string;
  source: string;
  country: "US" | "KR";
  category: string;
}

// Fallback static data when RSS fails
const FALLBACK_US: FeedItem[] = [
  { title: "연준 기준금리 4.25–4.50% 유지", link: "https://www.federalreserve.gov/monetarypolicy/openmarket.htm", date: "2025-01-29", source: "Federal Reserve", country: "US", category: "통화정책" },
  { title: "보편 관세 + 중국산 추가 관세 부과", link: "https://www.whitehouse.gov/trade", date: "2025-02-04", source: "White House", country: "US", category: "재정정책" },
  { title: "CHIPS Act 527억 달러 반도체 보조금", link: "https://www.semiconductors.org/chips/", date: "2024-12-15", source: "Commerce Dept.", country: "US", category: "산업정책" },
];

const FALLBACK_KR: FeedItem[] = [
  { title: "한은 기준금리 2.75% 동결", link: "https://www.bok.or.kr", date: "2025-02-27", source: "한국은행", country: "KR", category: "통화정책" },
  { title: "추경 포함 내수 활성화 패키지", link: "https://www.mosf.go.kr", date: "2025-03-05", source: "기획재정부", country: "KR", category: "재정정책" },
  { title: "수도권 그린벨트 해제 + 3기 신도시 가속", link: "https://www.molit.go.kr", date: "2025-01-15", source: "국토교통부", country: "KR", category: "부동산정책" },
];

export function PolicyWidget() {
  const { data, error, isLoading } = useSWR("/api/policy", fetcher, {
    refreshInterval: 3_600_000,
  });
  const [tab, setTab] = useState<"US" | "KR">("US");

  if (isLoading) return <LoadingCard title="경제 정책" />;

  // Use live data if available, fallback to static
  const hasLiveData = data && !data.error && (data.us?.length > 0 || data.kr?.length > 0);
  const usItems: FeedItem[] = hasLiveData ? data.us : FALLBACK_US;
  const krItems: FeedItem[] = hasLiveData ? data.kr : FALLBACK_KR;
  const items = tab === "US" ? usItems : krItems;

  return (
    <Card
      title="경제 정책"
      subtitle={
        hasLiveData
          ? `RSS 실시간 · ${relativeTime(data.updatedAt)} 업데이트`
          : "정적 데이터 (RSS 연결 시 자동 전환)"
      }
    >
      {/* Country tabs */}
      <div className="flex gap-1">
        {(["US", "KR"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={clsx(
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              tab === c ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {c === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
            <span className="ml-1 text-gray-600">({(c === "US" ? usItems : krItems).length})</span>
          </button>
        ))}
      </div>

      {/* Feed list */}
      <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">데이터 없음</div>
        ) : (
          items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white group-hover:text-blue-400 transition-colors leading-tight">
                  {item.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500">{item.source}</span>
                  <span className="text-[10px] text-gray-600">{item.category}</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{item.date}</span>
            </a>
          ))
        )}
      </div>
    </Card>
  );
}
