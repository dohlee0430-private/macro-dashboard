import { NextResponse } from "next/server";

export const revalidate = 300; // 5 minute cache

export async function GET() {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=6mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);
    const data = await res.json();

    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No result");

    const meta = result.meta;
    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

    const history = timestamps
      .map((t: number, i: number) => ({
        date: new Date(t * 1000).toISOString().split("T")[0],
        value: closes[i] != null ? Math.round(closes[i] * 100) / 100 : null,
      }))
      .filter((d: { date: string; value: number | null }) => d.value !== null);

    const rate = meta.regularMarketPrice;
    const prevClose = meta.previousClose;
    const change = rate - prevClose;
    const changePct = (change / prevClose) * 100;

    // High/low from history
    const values = history.map((h: { value: number | null }) => h.value as number);
    const high52w = Math.max(...values);
    const low52w = Math.min(...values);

    return NextResponse.json({
      rate: Math.round(rate * 100) / 100,
      previousClose: Math.round(prevClose * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      high6m: high52w,
      low6m: low52w,
      history,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Forex API error:", err);
    return NextResponse.json({ error: "Failed to fetch forex data" }, { status: 500 });
  }
}
