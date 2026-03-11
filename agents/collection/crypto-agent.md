# Crypto Agent

## 역할

Bitcoin, Ethereum의 USD/KRW 시세, 거래량, 시가총액, 김치프리미엄을 수집한다.

## 모델

- Claude Haiku

## 트리거

- 1분 간격 (24/7 상시 가동)
- Orchestrator로부터 수동 실행 명령

## 데이터 소스

| 데이터 | 소스 | 엔드포인트 | 비용 |
|--------|------|-----------|------|
| USD 시세 + 스파크라인 | CoinGecko | /coins/markets | 무료 (30 calls/min) |
| KRW 시세 | CoinGecko | /simple/price | 무료 |
| 김치프리미엄 계산 | CoinGecko + 환율 | 계산 | — |

### 대체 소스

- Binance API (BTC/USDT, ETH/USDT)
- 업비트 API (KRW 시세, 김프 정확도 향상)

## 수집 프로세스

```
1. CoinGecko /coins/markets 호출
   GET https://api.coingecko.com/api/v3/coins/markets
   ?vs_currency=usd
   &ids=bitcoin,ethereum
   &sparkline=true
   &price_change_percentage=24h,7d

2. CoinGecko /simple/price 호출 (KRW)
   GET https://api.coingecko.com/api/v3/simple/price
   ?ids=bitcoin,ethereum
   &vs_currencies=krw

3. 김치프리미엄 계산
   kimchi_premium = ((krw_price / usd_krw_rate) - usd_price) / usd_price * 100
   ※ usd_krw_rate는 Market Agent의 Redis 캐시에서 조회

4. 데이터 정규화
   {
     symbol: "BTC",
     price_usd: 87432.50,
     price_krw: 127500000,
     kimchi_premium_pct: 2.3,
     change_24h_pct: 3.42,
     change_7d_pct: -1.28,
     market_cap_usd: 1720000000000,
     volume_24h_usd: 42300000000,
     sparkline_7d: [...],
     collected_at: "2026-03-11T10:01:00Z"
   }

5. TimescaleDB 적재
   - crypto_prices 테이블에 INSERT

6. Redis 캐시 갱신
   - key: crypto:latest:{symbol}
   - TTL: 120초

7. Orchestrator에 완료 이벤트 발행
```

## 출력 스키마

```sql
CREATE TABLE crypto_prices (
  time              TIMESTAMPTZ NOT NULL,
  symbol            TEXT NOT NULL,
  price_usd         DOUBLE PRECISION,
  price_krw         DOUBLE PRECISION,
  kimchi_premium    DOUBLE PRECISION,
  change_24h_pct    DOUBLE PRECISION,
  change_7d_pct     DOUBLE PRECISION,
  market_cap_usd    DOUBLE PRECISION,
  volume_24h_usd    DOUBLE PRECISION,
  source            TEXT DEFAULT 'coingecko'
);

SELECT create_hypertable('crypto_prices', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| HTTP 429 | CoinGecko 무료 한도 초과. 60초 대기, 이후 Binance 폴백 |
| KRW 데이터 누락 | KRW 필드 null로 적재, 김프 계산 스킵 |
| 환율 캐시 미스 | Market Agent 최신 환율이 없으면 김프 계산 보류 |
| 스파크라인 비정상 | 스파크라인만 빈 배열로 적재, 나머지 정상 저장 |

## 제약 사항

- CoinGecko 무료 API는 분당 30회 제한. 1분 주기 수집 시 충분하지만, 병렬 호출 금지.
- 김치프리미엄은 환율 데이터 의존. Market Agent가 먼저 실행되어야 정확.
- 가격 데이터만 수집. 온체인 지표(해시레이트, 활성 주소 등)는 범위 밖.
