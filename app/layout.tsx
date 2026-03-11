import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "매크로 대시보드 | Macro Dashboard",
  description: "미국·한국 경제지표, 암호화폐, 증시, M2, 부동산을 한눈에",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
