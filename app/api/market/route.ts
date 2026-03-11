import { NextResponse } from "next/server";

export const revalidate = 300; // 5 minute cache

const SYMBOLS = [
  { symbol: "%5EGSPC", label: "S&P 500", short: "SPX" },
  { symbol: "%5EIXIC", label: "NASDAQ", short: "IXIC" },
  { symbol: "%5EKS11", label: "KOSPI", short: "KS11" },
  { symbol: "%5EDJI", label: "Dow Jones", short: "DJI" },
];

async function fetchYahooQuote(encodedSymbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=6mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Yahoo Finance error for ${encodedSymbol}: ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(async (s) => {
        const data = await fetchYahooQuote(s.symbol);
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error("No result");

        const meta = result.meta;
        const timestamps: number[] = result.timestamp ?? [];
        const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

        const history = timestamps
          .map((t: number, i: number) => ({
            date: new Date(t * 1000).toISOString().split("T")[0],
            value: closes[i] ?? null,
          }))
          .filter((d: { date: string; value: number | null }) => d.value !== null);

        return {
          ...s,
          price: meta.regularMarketPrice,
          previousClose: meta.previousClose,
          change: meta.regularMarketPrice - meta.previousClose,
          changePct: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          currency: meta.currency,
          history,
        };
      })
    );

    const indices = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { ...SYMBOLS[i], error: true, price: null, history: [] };
    });

    return NextResponse.json({ indices, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Market API error:", err);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
