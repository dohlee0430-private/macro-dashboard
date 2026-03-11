# Dashboard Agent

## 역할

수집·분석 결과를 프론트엔드가 소비할 수 있는 API 응답으로 변환하고, 캐시를 관리한다.

## 모델

- Claude Haiku (단순 포맷팅, 판단 불필요)

## 트리거

- 수집/분석 Agent 완료 이벤트 수신 시
- 캐시 TTL 만료 시 자동 갱신
- 사용자 요청으로 인한 캐시 미스

## 담당 API 엔드포인트

| 엔드포인트 | 데이터 소스 | 캐시 TTL |
|-----------|-----------|----------|
| `GET /api/crypto` | crypto_prices 테이블 + Redis | 60초 |
| `GET /api/market` | market_indices 테이블 + Redis | 300초 |
| `GET /api/m2` | macro_indicators (US M2) + Redis | 3600초 |
| `GET /api/korea-m2` | macro_indicators (KR M2) + Redis | 3600초 |
| `GET /api/realestate` | real_estate 테이블 + Redis | 86400초 |
| `GET /api/policy` | policy_analyses 테이블 + Redis | 14400초 |
| `GET /api/commentary` | commentaries 테이블 + Redis | 3600초 |
| `GET /api/anomalies` | anomalies 테이블 | 300초 |
| `GET /api/correlation` | correlation_reports 테이블 | 86400초 |

## 동작 프로세스

```
1. Agent 완료 이벤트 수신
   예: { agent: "market", status: "success", symbols: ["SPX", "IXIC", "KS11", "DJI"] }

2. 해당 엔드포인트의 응답 데이터 재구성
   - TimescaleDB에서 최신 데이터 조회
   - 프론트엔드 스키마에 맞게 변환
   - 히스토리 데이터 필요 시 범위 조회 (6개월, 1년 등)

3. Redis 캐시 갱신
   - key: api:response:{endpoint}
   - value: JSON 직렬화된 응답
   - TTL: 엔드포인트별 설정값

4. 응답 구조 (공통)
   {
     data: { ... },          // 엔드포인트별 데이터
     metadata: {
       updatedAt: "...",     // 마지막 데이터 수집 시각
       source: "...",        // 원천 소스
       stale: false,         // 데이터 신선도 (TTL 초과 시 true)
       nextUpdate: "..."     // 예상 다음 업데이트 시각
     }
   }
```

## 캐시 전략

```
요청 흐름:

Client → Next.js API Route → Redis 캐시 확인
                                 │
                        ┌────────┴────────┐
                        ▼                 ▼
                    캐시 HIT           캐시 MISS
                    즉시 반환          TimescaleDB 조회
                                         │
                                      응답 생성
                                         │
                                    Redis에 저장
                                         │
                                      반환
```

### Stale-While-Revalidate

- 캐시 만료 후에도 즉시 stale 데이터 반환
- 백그라운드에서 새 데이터 조회·갱신
- `stale: true` 플래그로 프론트엔드에 알림

## 프론트엔드 연동

프론트엔드(Next.js)에서 SWR로 각 엔드포인트 호출:

```typescript
// 프론트엔드 측
const { data } = useSWR('/api/market', fetcher, {
  refreshInterval: 300_000,  // 5분
});

// stale 표시
{data?.metadata?.stale && <Badge>데이터 지연 중</Badge>}
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| Redis 장애 | DB 직접 조회로 폴백 (성능 저하 허용) |
| DB 조회 실패 | 마지막 성공 캐시 반환 + stale 플래그 |
| 데이터 완전 부재 | HTTP 503 + 에러 메시지 |

## 제약 사항

- 데이터를 변환/포맷팅만 한다. 해석하지 않는다.
- 캐시 무효화(invalidation)는 Agent 이벤트 기반으로만 수행. 수동 무효화 금지.
- API 응답에 민감 정보(API 키, 내부 에러 스택 등)를 노출하지 않는다.
