import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 hour cache

// US M2 money supply from FRED (Federal Reserve Economic Data)
// Series: M2SL (M2 Money Stock, seasonally adjusted, billions of dollars)
export async function GET() {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "FRED_API_KEY not configured" }, { status: 503 });
  }

  try {
    const url = new URL("https://api.stlouisfed.org/fred/series/observations");
    url.searchParams.set("series_id", "M2SL");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("limit", "60"); // ~5 years of monthly data
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("observation_start", getStartDate(60));

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`FRED error: ${res.status}`);

    const data = await res.json();
    const observations: { date: string; value: string }[] = data.observations ?? [];

    const series = observations
      .filter((o) => o.value !== ".")
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
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
      unit: "Billions USD",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("M2 API error:", err);
    return NextResponse.json({ error: "Failed to fetch US M2 data" }, { status: 500 });
  }
}

function getStartDate(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().split("T")[0];
}
