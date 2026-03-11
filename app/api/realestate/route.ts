import { NextResponse } from "next/server";

export const revalidate = 3600;

// KB부동산 or 한국부동산원 공공데이터
// 한국부동산원 아파트 매매가격지수 (주간) - 공공데이터포털 API
// API key from: https://www.data.go.kr
export async function GET() {
  const apiKey = process.env.DATA_GO_KR_API_KEY;

  // If no API key, return curated static snapshot with source links
  if (!apiKey) {
    return NextResponse.json({
      note: "API key not configured. Configure DATA_GO_KR_API_KEY for live data.",
      sources: [
        {
          name: "한국부동산원 아파트가격동향",
          url: "https://www.reb.or.kr/r-one/statistics/statisticsViewer.do",
          description: "전국 아파트 매매·전세가격지수",
        },
        {
          name: "KB부동산 월간 주택가격동향",
          url: "https://kbland.kr/map",
          description: "KB국민은행 아파트 시세 및 전망",
        },
        {
          name: "국토교통부 실거래가",
          url: "https://rt.molit.go.kr",
          description: "아파트 실거래가 공개시스템",
        },
      ],
      regions: STATIC_REALESTATE_DATA,
      updatedAt: new Date().toISOString(),
    });
  }

  // TODO: Implement live data from 공공데이터포털
  // 한국부동산원 주간아파트가격동향 API
  return NextResponse.json({
    regions: STATIC_REALESTATE_DATA,
    updatedAt: new Date().toISOString(),
  });
}

// Static snapshot data (KRW 만원/m², approximate recent values)
const STATIC_REALESTATE_DATA = [
  { region: "서울", avgPricePerM2: 1350, yoyChange: 3.2, type: "아파트 매매" },
  { region: "강남구", avgPricePerM2: 3200, yoyChange: 4.1, type: "아파트 매매" },
  { region: "경기", avgPricePerM2: 620, yoyChange: 1.8, type: "아파트 매매" },
  { region: "부산", avgPricePerM2: 580, yoyChange: 2.1, type: "아파트 매매" },
  { region: "인천", avgPricePerM2: 520, yoyChange: 0.9, type: "아파트 매매" },
  { region: "대구", avgPricePerM2: 480, yoyChange: -0.5, type: "아파트 매매" },
  { region: "대전", avgPricePerM2: 460, yoyChange: 1.5, type: "아파트 매매" },
];
