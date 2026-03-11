import { NextResponse } from "next/server";

export const revalidate = 300;

// Yahoo Finance symbols for market indicators
const YAHOO_SYMBOLS = [
  { symbol: "GC=F", label: "Gold", short: "GOLD", unit: "USD/oz" },
  { symbol: "%5EVIX", label: "VIX", short: "VIX", unit: "" },
  { symbol: "%5ETNX", label: "US 10Y Yield", short: "US10Y", unit: "%" },
  { symbol: "%5EIRX", label: "US 13W T-Bill", short: "US13W", unit: "%" },
];

async function fetchYahooQuote(encodedSymbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=6mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Yahoo error: ${res.status}`);
  return res.json();
}

async function fetchFredSeries(seriesId: string, apiKey: string, limit = 24) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("sort_order", "desc");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FRED error: ${res.status}`);
  const data = await res.json();

  return (data.observations ?? [])
    .filter((o: { value: string }) => o.value !== ".")
    .map((o: { date: string; value: string }) => ({
      date: o.date,
      value: parseFloat(o.value),
    }))
    .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
}

export async function GET() {
  try {
    const fredKey = process.env.FRED_API_KEY;

    // 1. Yahoo Finance quotes (Gold, VIX, Treasury yields)
    const yahooResults = await Promise.allSettled(
      YAHOO_SYMBOLS.map(async (s) => {
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
          .filter((d: { value: number | null }) => d.value !== null);

        return {
          ...s,
          price: meta.regularMarketPrice,
          previousClose: meta.previousClose,
          change: meta.regularMarketPrice - meta.previousClose,
          changePct:
            ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          history,
        };
      })
    );

    const yahooData = yahooResults.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { ...YAHOO_SYMBOLS[i], price: null, change: 0, changePct: 0, history: [] };
    });

    // Extract specific items
    const gold = yahooData.find((d) => d.short === "GOLD");
    const vix = yahooData.find((d) => d.short === "VIX");
    const us10y = yahooData.find((d) => d.short === "US10Y");
    const us13w = yahooData.find((d) => d.short === "US13W");

    // Compute approximate spread (10Y - 13W as proxy; 2Y would be better from FRED)
    let spread = null;
    let spreadHistory: { date: string; value: number }[] = [];

    // 2. FRED data (CPI, Unemployment, 2Y yield for spread)
    let cpi = null;
    let unemployment = null;

    if (fredKey) {
      const [cpiData, unrateData, dgs2Data, dgs10Data] = await Promise.allSettled([
        fetchFredSeries("CPIAUCSL", fredKey, 24),
        fetchFredSeries("UNRATE", fredKey, 24),
        fetchFredSeries("DGS2", fredKey, 180),
        fetchFredSeries("DGS10", fredKey, 180),
      ]);

      if (cpiData.status === "fulfilled" && cpiData.value.length > 1) {
        const series = cpiData.value;
        const latest = series[series.length - 1];
        const prev = series[series.length - 2];
        const yoy = series[series.length - 13];
        cpi = {
          value: latest.value,
          date: latest.date,
          momChange: prev ? ((latest.value - prev.value) / prev.value) * 100 : null,
          yoyChange: yoy ? ((latest.value - yoy.value) / yoy.value) * 100 : null,
          series: series.slice(-12),
        };
      }

      if (unrateData.status === "fulfilled" && unrateData.value.length > 0) {
        const series = unrateData.value;
        const latest = series[series.length - 1];
        const prev = series[series.length - 2];
        unemployment = {
          value: latest.value,
          date: latest.date,
          change: prev ? latest.value - prev.value : null,
          series: series.slice(-12),
        };
      }

      // Real 10Y-2Y spread from FRED
      if (dgs2Data.status === "fulfilled" && dgs10Data.status === "fulfilled") {
        const d2 = dgs2Data.value;
        const d10 = dgs10Data.value;
        // Match dates for spread calculation
        const d2Map = new Map(d2.map((d: { date: string; value: number }) => [d.date, d.value]));
        spreadHistory = d10
          .filter((d: { date: string }) => d2Map.has(d.date))
          .map((d: { date: string; value: number }) => ({
            date: d.date,
            value: Math.round((d.value - (d2Map.get(d.date) as number)) * 100) / 100,
          }))
          .slice(-120); // ~6 months of daily data

        if (spreadHistory.length > 0) {
          spread = spreadHistory[spreadHistory.length - 1].value;
        }
      }
    }

    // Fallback spread from Yahoo if FRED unavailable
    if (spread === null && us10y?.price != null && us13w?.price != null) {
      spread = Math.round((us10y.price - us13w.price) * 100) / 100;
    }

    return NextResponse.json({
      gold: gold
        ? {
            price: gold.price,
            change: Math.round(gold.change * 100) / 100,
            changePct: Math.round(gold.changePct * 100) / 100,
            history: gold.history,
          }
        : null,
      vix: vix
        ? {
            value: vix.price,
            change: Math.round(vix.change * 100) / 100,
            changePct: Math.round(vix.changePct * 100) / 100,
            history: vix.history,
            level:
              vix.price < 15 ? "low" : vix.price < 25 ? "normal" : vix.price < 35 ? "high" : "extreme",
          }
        : null,
      treasurySpread: {
        value: spread,
        inverted: spread !== null && spread < 0,
        history: spreadHistory,
        label: fredKey ? "10Y-2Y" : "10Y-13W (근사)",
      },
      cpi,
      unemployment,
      hasFredKey: !!fredKey,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Indicators API error:", err);
    return NextResponse.json({ error: "Failed to fetch indicators" }, { status: 500 });
  }
}
