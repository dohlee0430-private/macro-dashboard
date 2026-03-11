import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 hour

interface FeedItem {
  title: string;
  link: string;
  date: string;
  source: string;
  country: "US" | "KR";
  category: string;
}

const RSS_SOURCES = [
  {
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    source: "Federal Reserve",
    country: "US" as const,
    category: "통화정책",
  },
  {
    url: "https://www.federalreserve.gov/feeds/press_other.xml",
    source: "Federal Reserve",
    country: "US" as const,
    category: "기타정책",
  },
  {
    url: "https://home.treasury.gov/system/files/136/TreasStatements.xml",
    source: "US Treasury",
    country: "US" as const,
    category: "재정정책",
  },
];

// Simple XML tag extractor (avoids xml parser dependency)
function extractTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

async function fetchRssFeed(
  url: string,
  source: string,
  country: "US" | "KR",
  category: string,
): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MacroDashboard/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: FeedItem[] = [];
    // Extract <item> blocks
    const itemBlocks = extractTags(xml, "item");
    for (const block of itemBlocks.slice(0, 10)) {
      const titles = extractTags(block, "title");
      const links = extractTags(block, "link");
      const dates = extractTags(block, "pubDate");

      if (titles.length > 0) {
        items.push({
          title: stripCdata(titles[0]),
          link: stripCdata(links[0] ?? ""),
          date: dates[0] ? new Date(dates[0]).toISOString().split("T")[0] : "",
          source,
          country,
          category,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

// Korean sources: scrape BOK press releases page (no RSS available)
async function fetchBokPressReleases(): Promise<FeedItem[]> {
  try {
    const url = "https://www.bok.or.kr/portal/bbs/B0000245/list.do?menuNo=200761&pageIndex=1";
    const res = await fetch(url, {
      headers: { "User-Agent": "MacroDashboard/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract titles and dates from the list page
    const items: FeedItem[] = [];
    const titleRegex = /class="title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const dateRegex = /class="date"[^>]*>([\d.]+)/gi;

    const titles: { link: string; title: string }[] = [];
    let match;
    while ((match = titleRegex.exec(html)) !== null) {
      titles.push({
        link: "https://www.bok.or.kr" + match[1].trim(),
        title: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }

    const dates: string[] = [];
    while ((match = dateRegex.exec(html)) !== null) {
      dates.push(match[1].replace(/\./g, "-"));
    }

    for (let i = 0; i < Math.min(titles.length, 10); i++) {
      items.push({
        title: titles[i].title,
        link: titles[i].link,
        date: dates[i] ?? "",
        source: "한국은행",
        country: "KR",
        category: "통화정책",
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchMosfPressReleases(): Promise<FeedItem[]> {
  try {
    const url = "https://www.moef.go.kr/nw/nes/nesdta.do?searchBbsId1=MOSFBBS_000000000028&menuNo=4010100";
    const res = await fetch(url, {
      headers: { "User-Agent": "MacroDashboard/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const items: FeedItem[] = [];
    const rowRegex = /<td class="tit"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td class="date"[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null && items.length < 10) {
      items.push({
        title: match[2].replace(/<[^>]*>/g, "").trim(),
        link: match[1].startsWith("http") ? match[1] : "https://www.moef.go.kr" + match[1],
        date: match[3].trim().replace(/\./g, "-"),
        source: "기획재정부",
        country: "KR",
        category: "재정정책",
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const results = await Promise.allSettled([
      ...RSS_SOURCES.map((s) => fetchRssFeed(s.url, s.source, s.country, s.category)),
      fetchBokPressReleases(),
      fetchMosfPressReleases(),
    ]);

    const allItems: FeedItem[] = results
      .filter((r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    const us = allItems.filter((i) => i.country === "US").slice(0, 10);
    const kr = allItems.filter((i) => i.country === "KR").slice(0, 10);

    return NextResponse.json({
      us,
      kr,
      totalCount: allItems.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Policy API error:", err);
    return NextResponse.json({ error: "Failed to fetch policy data" }, { status: 500 });
  }
}
