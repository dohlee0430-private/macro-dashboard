# Iteration 4 평가

## 날짜
2026-03-12

## 사용자 답변 반영

| 질문 | 답변 | 반영 |
|------|------|------|
| Q1. 부동산 API 키 | (b) 미발급 | .env.example에 발급 안내 추가, 코드 구조 준비 |
| Q2. 추가 지표 | CPI, 실업률, 국채 스프레드, 금, VIX | 전부 구현 |
| Q3. 배포 | (a) Vercel | vercel.json 추가, 서울 리전(icn1) |

## 변경 사항

### 신규

| 항목 | 설명 | 데이터 소스 |
|------|------|-----------|
| `/api/indicators` | 금, VIX, 국채 스프레드, CPI, 실업률 통합 API | Yahoo Finance (금, VIX, 국채) + FRED (CPI, 실업률, 10Y-2Y) |
| `IndicatorsWidget` | 5개 지표 박스 + 차트 3탭 (스프레드/금/VIX) | — |
| OverviewStrip | GOLD, VIX 티커 추가 | Yahoo Finance |
| `vercel.json` | Vercel 배포 설정, 서울 리전 | — |
| `.env.example` | 공공데이터포털 키 안내 추가 | — |

### 데이터 소스 계층화

금/VIX/국채 → Yahoo Finance (키 불필요, 즉시 동작)
CPI/실업률/정확한 스프레드 → FRED API (키 필요, 없으면 graceful degradation)

### VIX 레벨 분류

| VIX 범위 | 레벨 | 표시 |
|----------|------|------|
| < 15 | low | 안정 (초록) |
| 15~25 | normal | 보통 (파랑) |
| 25~35 | high | 경계 (주황) |
| > 35 | extreme | 공포 (빨강) |

---

## 평가 결과

### 잘된 점

1. **번들 크기 유지**: 지표 5개 추가에도 163KB 유지 (lightweight-charts 재활용)
2. **Graceful degradation**: FRED 키 없이도 금/VIX/근사 스프레드는 표시
3. **정보 밀도 높음**: 5개 지표를 한 카드에 컴팩트하게, 차트는 탭 전환
4. **VIX 레벨 시각화**: 숫자만으로는 의미 파악 어려우므로 "안정/보통/경계/공포" 레이블 추가
5. **Vercel 서울 리전**: 한국 사용자 접근 지연 최소화

### 미흡한 점

1. **스프레드 근사치**: FRED 키 없으면 10Y-13W(Yahoo)로 대체. 실제 10Y-2Y와 차이 있음
2. **CPI YoY는 직접 계산**: BLS 공식 YoY와 미세한 차이 가능 (계절조정 방식)
3. **IndicatorsWidget이 넓음**: full-width 카드인데 모바일에서 5개 박스 레이아웃이 2행으로 잘리는 게 최적인지 검증 필요

---

## 현재 대시보드 전체 지표

| 섹션 | 지표 | 소스 | 키 필요 |
|------|------|------|---------|
| 상단 스트립 | SPX, IXIC, KS11, DJI, USD/KRW, GOLD, VIX, BTC, ETH | Yahoo + CoinGecko | X |
| 글로벌 증시 | S&P500, NASDAQ, KOSPI, Dow Jones 차트 | Yahoo Finance | X |
| 암호화폐 | BTC, ETH 시세 + 7일 차트 + KRW | CoinGecko | X |
| 환율 | USD/KRW 차트 + 6개월 고저 | Yahoo Finance | X |
| 미국 경제지표 | 금, VIX, 국채 스프레드, CPI, 실업률 | Yahoo + FRED | △ |
| M2 통화량 | 미국 M2, 한국 M2 | FRED, BOK | O |
| 경제 정책 | 연준 RSS + Google News | RSS | X |
| 부동산 | 아파트 매매가, 전세가율, 거래량 | 정적 스냅샷 | (△) |

**총 20+ 지표**, API 키 없이 15개 이상 즉시 동작.

---

## 모호한 부분 — 사용자에게 질문

### Q1. Vercel 배포 진행 여부
지금 바로 Vercel에 배포할까요?
- (a) 바로 배포 (`vercel` CLI 또는 GitHub 연동)
- (b) 아직 아님, 더 다듬고 나서

**→ 사용자 답변:** (대기 중)

### Q2. 부동산 API 발급 안내
공공데이터포털에서 아래 API를 발급받아야 합니다:
1. https://www.data.go.kr 회원가입
2. "국토교통부 아파트매매 실거래 상세 자료" 검색 → 활용신청
3. 발급된 키를 `.env.local`의 `DATA_GO_KR_API_KEY`에 입력

발급 후 알려주시면 바로 연동하겠습니다.

**→ 사용자 답변:** (대기 중)

### Q3. 모바일 검증
현재 모바일 레이아웃은 CSS 기반 반응형만 적용된 상태입니다.
실기기 테스트 후 조정이 필요한 부분이 있으면 알려주세요.

**→ 사용자 답변:** (대기 중)
