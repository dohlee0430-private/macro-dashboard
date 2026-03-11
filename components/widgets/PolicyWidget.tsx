"use client";

import { Card } from "@/components/ui/Card";

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

// Curated policy snapshot - update periodically or integrate a news API
const POLICY_ITEMS: PolicyItem[] = [
  {
    country: "US",
    category: "통화정책",
    title: "연준 기준금리",
    description: "Federal Reserve 기준금리 4.25–4.50%. FOMC는 인플레이션 목표치(2%) 도달까지 현 수준 유지 시사.",
    date: "2025-01",
    source: "Federal Reserve",
    url: "https://www.federalreserve.gov/monetarypolicy/openmarket.htm",
    impact: "neutral",
  },
  {
    country: "US",
    category: "재정정책",
    title: "관세 정책 강화",
    description: "트럼프 행정부의 보편 관세 및 중국산 제품 추가 관세 부과. 무역수지 및 인플레이션에 영향.",
    date: "2025-02",
    source: "White House",
    url: "https://www.whitehouse.gov/trade",
    impact: "negative",
  },
  {
    country: "KR",
    category: "통화정책",
    title: "한국은행 기준금리",
    description: "한국은행 기준금리 2.75%. 내수 부진과 원화 약세 사이에서 완화적 기조 유지.",
    date: "2025-02",
    source: "한국은행",
    url: "https://www.bok.or.kr/portal/main/contents.do?menuNo=200656",
    impact: "neutral",
  },
  {
    country: "KR",
    category: "재정정책",
    title: "2025년 경기부양 예산",
    description: "정부 추경안 포함 내수 활성화 패키지. 반도체·AI 산업 지원 확대.",
    date: "2025-03",
    source: "기획재정부",
    url: "https://www.mosf.go.kr",
    impact: "positive",
  },
  {
    country: "US",
    category: "산업정책",
    title: "CHIPS Act 반도체 보조금",
    description: "반도체 국내 생산 촉진을 위한 527억 달러 지원. 주요 파운드리 투자 유치.",
    date: "2024-12",
    source: "Commerce Dept.",
    url: "https://www.semiconductors.org/chips/",
    impact: "positive",
  },
  {
    country: "KR",
    category: "부동산정책",
    title: "주택공급 확대 방안",
    description: "수도권 그린벨트 해제 및 3기 신도시 공급 가속화. 250만호 공급 목표.",
    date: "2025-01",
    source: "국토교통부",
    url: "https://www.molit.go.kr",
    impact: "positive",
  },
];

const IMPACT_STYLES = {
  positive: "border-l-emerald-500 bg-emerald-900/10",
  negative: "border-l-red-500 bg-red-900/10",
  neutral: "border-l-blue-500 bg-blue-900/10",
};

const IMPACT_BADGE = {
  positive: "text-emerald-400 bg-emerald-900/30",
  negative: "text-red-400 bg-red-900/30",
  neutral: "text-blue-400 bg-blue-900/30",
};

const COUNTRY_FLAG = { US: "🇺🇸", KR: "🇰🇷" };

export function PolicyWidget() {
  const usItems = POLICY_ITEMS.filter((p) => p.country === "US");
  const krItems = POLICY_ITEMS.filter((p) => p.country === "KR");

  return (
    <Card title="경제 정책 동향" className="col-span-full lg:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PolicyColumn title="🇺🇸 미국" items={usItems} />
        <PolicyColumn title="🇰🇷 한국" items={krItems} />
      </div>
    </Card>
  );
}

function PolicyColumn({ title, items }: { title: string; items: PolicyItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      {items.map((item, i) => (
        <PolicyCard key={i} item={item} />
      ))}
    </div>
  );
}

function PolicyCard({ item }: { item: PolicyItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block border-l-2 rounded-r-lg px-3 py-2 hover:opacity-80 transition-opacity ${
        IMPACT_STYLES[item.impact]
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-500">{item.category}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${IMPACT_BADGE[item.impact]}`}
        >
          {item.impact === "positive" ? "긍정" : item.impact === "negative" ? "부정" : "중립"}
        </span>
        <span className="text-xs text-gray-600 ml-auto">{item.date}</span>
      </div>
      <div className="text-sm font-medium text-white">{item.title}</div>
      <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.description}</div>
      <div className="text-xs text-gray-600 mt-1">출처: {item.source}</div>
    </a>
  );
}

// Suppress unused variable warning
void COUNTRY_FLAG;
