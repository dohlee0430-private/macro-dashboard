"use client";

import { Card } from "@/components/ui/Card";
import clsx from "clsx";

interface PolicyItem {
  country: "US" | "KR";
  category: string;
  title: string;
  description: string;
  date: string;
  source: string;
  url: string;
  impact: "positive" | "negative" | "neutral";
}

const POLICY_ITEMS: PolicyItem[] = [
  {
    country: "US",
    category: "통화정책",
    title: "연준 기준금리 4.25–4.50%",
    description: "인플레이션 목표치(2%) 도달까지 현 수준 유지 시사",
    date: "2025-01",
    source: "Federal Reserve",
    url: "https://www.federalreserve.gov/monetarypolicy/openmarket.htm",
    impact: "neutral",
  },
  {
    country: "US",
    category: "재정정책",
    title: "보편 관세 + 중국산 추가 관세",
    description: "무역수지 및 인플레이션에 영향",
    date: "2025-02",
    source: "White House",
    url: "https://www.whitehouse.gov/trade",
    impact: "negative",
  },
  {
    country: "US",
    category: "산업정책",
    title: "CHIPS Act 527억 달러 반도체 보조금",
    description: "국내 파운드리 생산 촉진",
    date: "2024-12",
    source: "Commerce Dept.",
    url: "https://www.semiconductors.org/chips/",
    impact: "positive",
  },
  {
    country: "KR",
    category: "통화정책",
    title: "한은 기준금리 2.75%",
    description: "내수 부진·원화 약세 사이 완화 기조 유지",
    date: "2025-02",
    source: "한국은행",
    url: "https://www.bok.or.kr/portal/main/contents.do?menuNo=200656",
    impact: "neutral",
  },
  {
    country: "KR",
    category: "재정정책",
    title: "추경 포함 내수 활성화 패키지",
    description: "반도체·AI 산업 지원 확대",
    date: "2025-03",
    source: "기획재정부",
    url: "https://www.mosf.go.kr",
    impact: "positive",
  },
  {
    country: "KR",
    category: "부동산",
    title: "수도권 그린벨트 해제 + 3기 신도시",
    description: "250만호 공급 목표",
    date: "2025-01",
    source: "국토교통부",
    url: "https://www.molit.go.kr",
    impact: "positive",
  },
];

const IMPACT_DOT = {
  positive: "bg-emerald-400",
  negative: "bg-red-400",
  neutral: "bg-blue-400",
};

export function PolicyWidget() {
  const us = POLICY_ITEMS.filter((p) => p.country === "US");
  const kr = POLICY_ITEMS.filter((p) => p.country === "KR");

  return (
    <Card title="경제 정책 동향">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PolicyList label="미국" flag="US" items={us} />
        <PolicyList label="한국" flag="KR" items={kr} />
      </div>
    </Card>
  );
}

function PolicyList({ label, flag, items }: { label: string; flag: string; items: PolicyItem[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 mb-2">
        {flag === "US" ? "🇺🇸" : "🇰🇷"} {label}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <div className={clsx("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", IMPACT_DOT[item.impact])} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                  {item.title}
                </span>
                <span className="text-[10px] text-gray-600 shrink-0">{item.category}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">{item.description}</div>
            </div>
            <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{item.date}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
