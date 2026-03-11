import { NextResponse } from "next/server";

export const revalidate = 3600;

// Bank of Korea Open API - M2 (광의통화, 조원)
// 통계표 코드: 101Y004 (통화 및 유동성 - M2 계절조정)
export async function GET() {
  const apiKey = process.env.BOK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "BOK_API_KEY not configured" }, { status: 503 });
  }

  try {
    const today = new Date();
    const endPeriod = formatBokDate(today, 0);
    const startPeriod = formatBokDate(today, -60);

    const url = new URL("https://ecos.bok.or.kr/api/StatisticSearch/" + apiKey + "/json/kr/1/100/101Y004/MM/" + startPeriod + "/" + endPeriod + "/");

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`BOK error: ${res.status}`);

    const data = await res.json();
    const rows: { TIME: string; DATA_VALUE: string }[] =
      data?.StatisticSearch?.row ?? [];

    const series = rows
      .filter((r) => r.DATA_VALUE && r.DATA_VALUE !== "0")
      .map((r) => ({
        date: formatIsoDate(r.TIME),
        value: parseFloat(r.DATA_VALUE.replace(/,/g, "")),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const latest = series[series.length - 1];
    const prev = series[series.length - 2];
    const yoy = series[series.length - 13];

    return NextResponse.json({
      series,
      latest: latest?.value ?? null,
      latestDate: latest?.date ?? null,
      momChange: prev ? ((latest.value - prev.value) / prev.value) * 100 : null,
      yoyChange: yoy ? ((latest.value - yoy.value) / yoy.value) * 100 : null,
      unit: "조원 (Trillion KRW)",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Korea M2 API error:", err);
    return NextResponse.json({ error: "Failed to fetch Korea M2 data" }, { status: 500 });
  }
}

function formatBokDate(date: Date, monthOffset: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + monthOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function formatIsoDate(bokTime: string): string {
  // BOK format: YYYYMM -> YYYY-MM-01
  return `${bokTime.slice(0, 4)}-${bokTime.slice(4, 6)}-01`;
}
