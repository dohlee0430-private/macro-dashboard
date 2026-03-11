# Market Agent

## 역할

S&P 500, NASDAQ, KOSPI, Dow Jones, 원/달러 환율 등 주요 주가지수와 환율을 수집하여 DB에 적재한다.

## 모델

- Claude Haiku (판단 불필요, 수집 전용)

## 트리거

- 장중: 5분 간격
- 장외: 1시간 간격
- Orchestrator로부터 수동 실행 명령

## 데이터 소스

| 지표 | 심볼 | 소스 | 비용 |
|------|------|------|------|
| S&P 500 | ^GSPC | Yahoo Finance API | 무료 |
| NASDAQ | ^IXIC | Yahoo Finance API | 무료 |
| KOSPI | ^KS11 | Yahoo Finance API | 무료 |
| Dow Jones | ^DJI | Yahoo Finance API | 무료 |
| USD/KRW | USDKRW=X | Yahoo Finance API | 무료 |

### 대체 소스 (Yahoo 장애 시 폴백)

- Alpha Vantage API (일 25회 무료)
- KRX 정보데이터시스템 (KOSPI 전용)

## 수집 프로세스

```
1. Yahoo Finance chart API 호출
   GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
   ?interval=1d&range=6mo

2. 응답 파싱
   - meta.regularMarketPrice → 현재가
   - meta.previousClose → 전일 종가
   - timestamp[] + indicators.quote[0].close[] → 히스토리

3. 데이터 정규화
   {
     symbol: "SPX",
     price: 5234.18,
     previous_close: 5210.44,
     change: 23.74,
     change_pct: 0.46,
     currency: "USD",
     history: [...],
     collected_at: "2026-03-11T10:05:00Z"
   }

4. TimescaleDB 적재
   - market_indices 테이블에 INSERT
   - 중복 체크 (같은 시각 데이터 존재 시 SKIP)

5. Redis 캐시 갱신
   - key: market:latest:{symbol}
   - TTL: 600초

6. Orchestrator에 완료 이벤트 발행
   { agent: "market", status: "success", symbols: [...], timestamp: "..." }
```

## 출력 스키마

```sql
CREATE TABLE market_indices (
  time        TIMESTAMPTZ NOT NULL,
  symbol      TEXT NOT NULL,
  label       TEXT,
  price       DOUBLE PRECISION,
  prev_close  DOUBLE PRECISION,
  change      DOUBLE PRECISION,
  change_pct  DOUBLE PRECISION,
  currency    TEXT,
  source      TEXT DEFAULT 'yahoo'
);

SELECT create_hypertable('market_indices', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| HTTP 429 (Rate Limit) | 60초 대기 후 재시도 |
| HTTP 5xx | 30초 후 재시도, 3회 실패 시 폴백 소스 전환 |
| 응답 파싱 실패 | 로그 기록, Orchestrator에 실패 보고 |
| 가격 0 또는 null | 이상치로 판단, 적재하지 않고 경고 발행 |

## 제약 사항

- 수집만 한다. 해석하지 않는다.
- Yahoo Finance 비공식 API이므로 User-Agent 헤더 필수.
- 장 마감 후에도 afterHours 가격은 수집하되 별도 플래그 표시.
