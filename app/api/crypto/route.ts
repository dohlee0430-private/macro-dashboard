import { NextResponse } from "next/server";

export const revalidate = 60; // 1 minute cache

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?" +
        new URLSearchParams({
          vs_currency: "usd",
          ids: "bitcoin,ethereum",
          order: "market_cap_desc",
          sparkline: "true",
          price_change_percentage: "24h,7d",
        }),
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();

    // Fetch KRW prices separately
    const krwRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?" +
        new URLSearchParams({
          ids: "bitcoin,ethereum",
          vs_currencies: "krw",
        }),
      { next: { revalidate: 60 } }
    );

    const krwData = krwRes.ok ? await krwRes.json() : {};

    const coins = data.map(
      (coin: {
        id: string;
        symbol: string;
        name: string;
        current_price: number;
        price_change_percentage_24h: number;
        price_change_percentage_7d_in_currency: number;
        market_cap: number;
        total_volume: number;
        sparkline_in_7d: { price: number[] };
        image: string;
      }) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        priceUsd: coin.current_price,
        priceKrw: krwData[coin.id]?.krw ?? null,
        change24h: coin.price_change_percentage_24h,
        change7d: coin.price_change_percentage_7d_in_currency,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        sparkline: coin.sparkline_in_7d?.price ?? [],
        image: coin.image,
      })
    );

    return NextResponse.json({ coins, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Crypto API error:", err);
    return NextResponse.json({ error: "Failed to fetch crypto data" }, { status: 500 });
  }
}
