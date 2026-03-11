# Iteration 3 평가

## 날짜
2026-03-12

## 사용자 답변 반영

| 질문 | 답변 | 반영 |
|------|------|------|
| Q1. 정책 RSS 실패 대응 | (b) Google News RSS | Google News RSS 3개 피드 추가 (한국 경제정책, 한은 금리, US economy) |
| Q2. 부동산 실시간화 | (a) 다음 iteration에서 연동 | 공공데이터포털 연동 구조 준비 (API 키 있을 때 활성화) |
| Q3. 차트 라이브러리 | (b) lightweight-charts | Recharts 제거, TradingView lightweight-charts v4 전환 |
| Q4. 다크/라이트 모드 | (b) 토글 필요 | ThemeProvider + CSS 변수 기반 테마 시스템 구현 |

## 변경 사항

### 핵심 변경

| 항목 | Before | After | 효과 |
|------|--------|-------|------|
| 차트 라이브러리 | Recharts (53KB) | lightweight-charts (27KB) | **First Load JS 216KB → 162KB (25% 감소)** |
| 테마 | 다크 고정 | 다크/라이트 토글 | CSS 변수 기반, localStorage 저장 |
| 정책 소스 | 연준 RSS + 한은/기재부 크롤링 | + Google News RSS 3개 피드 | 한국 정책 뉴스 안정적 수집 |
| 색상 시스템 | Tailwind 하드코딩 (gray-900 등) | CSS 변수 (--bg-card, --text-primary 등) | 테마 전환 시 일괄 변경 |

### 신규 파일

- `lib/theme.tsx` — ThemeProvider, useTheme 훅
- `components/ui/LightweightChart.tsx` — TradingView 차트 React 래퍼

### 삭제

- `recharts` 의존성 제거 (package.json에서 삭제)

---

## 평가 결과

### 잘된 점

1. **번들 크기 25% 감소**: 162KB는 금융 대시보드치고 경량. 모바일 로딩 체감 개선
2. **차트 품질 향상**: lightweight-charts는 금융 차트 전문. 크로스헤어, 가격 축 등 기본 제공
3. **테마 시스템 견고**: CSS 변수 기반이라 컴포넌트별 분기 없이 일괄 전환
4. **Google News 폴백**: 한은/기재부 HTML 크롤링 실패 시에도 한국 정책 뉴스 수집 가능

### 미흡한 점

1. **공공데이터포털 연동 미완료**: 부동산 여전히 정적 스냅샷
2. **lightweight-charts SSR 제한**: 서버 사이드에서 렌더링 불가, CSR 전용 (현재 "use client"로 해결)
3. **테마 전환 시 차트 깜빡임 가능**: 차트가 theme prop 변경 시 옵션만 업데이트하지만 색상 전환이 즉각적이지 않을 수 있음
4. **Google News RSS 중복 가능**: 같은 뉴스가 여러 키워드에 걸려 중복 표시될 수 있음

---

## 모호한 부분 — 사용자에게 질문

### Q1. 공공데이터포털 부동산 API 키
공공데이터포털(data.go.kr) API 키를 발급받으셨나요?
- (a) 이미 발급 완료 → 바로 연동 구현
- (b) 아직 미발급 → 발급 방법 안내 후 연동 준비만

**→ 사용자 답변:** (대기 중)

### Q2. 추가 지표 요청
현재 대시보드에 없는 지표 중 추가하고 싶은 것이 있나요?
- 미국: CPI, 실업률, PMI, 10년/2년 국채 스프레드
- 한국: CPI, 실업률, 수출입동향
- 기타: 금 시세, 원유(WTI), VIX 공포지수
- 없음 (현재로 충분)

**→ 사용자 답변:** (대기 중)

### Q3. 배포 환경
대시보드를 어디에 배포할 계획인가요?
- (a) Vercel (Next.js 최적화, 무료 tier)
- (b) 자체 서버
- (c) 아직 미정
이에 따라 환경변수 설정, 빌드 최적화 전략이 달라집니다.

**→ 사용자 답변:** (대기 중)

---

## 현재 기술 스택 정리

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 15.2 (App Router, Turbopack) |
| 차트 | TradingView lightweight-charts v4 |
| 스타일 | Tailwind CSS + CSS 변수 (다크/라이트) |
| 데이터 패칭 | SWR (클라이언트) + Next.js Route Handlers (서버) |
| 번들 크기 | First Load 162KB |

## 무료 데이터 소스 정리

| 데이터 | 소스 | 키 필요 | 상태 |
|--------|------|---------|------|
| 주가지수 (S&P500, NASDAQ, KOSPI, DJI) | Yahoo Finance | X | 동작 중 |
| 환율 (USD/KRW) | Yahoo Finance | X | 동작 중 |
| 암호화폐 (BTC, ETH) | CoinGecko | X | 동작 중 |
| 미국 M2 | FRED | O (무료) | 키 발급 시 동작 |
| 한국 M2 | 한국은행 ECOS | O (무료) | 키 발급 시 동작 |
| 경제 정책 (미국) | Federal Reserve RSS | X | 동작 중 |
| 경제 정책 (한국) | Google News RSS | X | 동작 중 |
| 부동산 | 공공데이터포털 | O (무료) | **미연동** |
