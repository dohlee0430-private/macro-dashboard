export function formatNumber(n: number, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPrice(n: number, currency = "USD"): string {
  if (n === null || n === undefined) return "—";
  if (currency === "USD") {
    if (n >= 1000) return "$" + formatNumber(n, 0);
    if (n >= 1) return "$" + formatNumber(n, 2);
    return "$" + n.toFixed(4);
  }
  if (currency === "KRW") {
    if (n >= 100_000_000) return (n / 100_000_000).toFixed(1) + "억원";
    if (n >= 10_000) return (n / 10_000).toFixed(0) + "만원";
    return n.toLocaleString("ko-KR") + "원";
  }
  return formatNumber(n);
}

export function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "T";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  return formatNumber(n, 0);
}

export function formatPct(n: number | null, prefix = ""): string {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return prefix + sign + n.toFixed(2) + "%";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function relativeTime(isoStr: string): string {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return Math.floor(diff / 86400) + "일 전";
}
