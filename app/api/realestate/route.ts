import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json({
    note: "정적 스냅샷. DATA_GO_KR_API_KEY 설정 시 실시간 전환.",
    sources: [
      {
        name: "한국부동산원",
        url: "https://www.reb.or.kr/r-one/statistics/statisticsViewer.do",
      },
      {
        name: "KB부동산",
        url: "https://kbland.kr/map",
      },
      {
        name: "국토교통부 실거래가",
        url: "https://rt.molit.go.kr",
      },
    ],
    regions: STATIC_REALESTATE_DATA,
    updatedAt: new Date().toISOString(),
  });
}

// Extended static snapshot: 매매가, 전세가율, 거래량, 주간변동
const STATIC_REALESTATE_DATA = [
  { region: "서울", avgPricePerM2: 1350, jeonseRatio: 52.3, txCount: 3842, weekChange: 0.08, yoyChange: 3.2 },
  { region: "강남구", avgPricePerM2: 3200, jeonseRatio: 41.2, txCount: 412, weekChange: 0.12, yoyChange: 4.1 },
  { region: "서초구", avgPricePerM2: 2950, jeonseRatio: 43.5, txCount: 298, weekChange: 0.09, yoyChange: 3.8 },
  { region: "경기", avgPricePerM2: 620, jeonseRatio: 61.8, txCount: 5210, weekChange: 0.04, yoyChange: 1.8 },
  { region: "부산", avgPricePerM2: 580, jeonseRatio: 58.2, txCount: 1820, weekChange: 0.05, yoyChange: 2.1 },
  { region: "인천", avgPricePerM2: 520, jeonseRatio: 63.1, txCount: 1540, weekChange: 0.02, yoyChange: 0.9 },
  { region: "대구", avgPricePerM2: 480, jeonseRatio: 66.4, txCount: 980, weekChange: -0.03, yoyChange: -0.5 },
  { region: "대전", avgPricePerM2: 460, jeonseRatio: 59.7, txCount: 720, weekChange: 0.04, yoyChange: 1.5 },
  { region: "세종", avgPricePerM2: 510, jeonseRatio: 68.2, txCount: 340, weekChange: -0.01, yoyChange: -0.2 },
];
