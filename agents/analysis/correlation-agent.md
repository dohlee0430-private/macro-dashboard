# Correlation Agent

## 역할

서로 다른 지표 간의 상관관계를 분석하여, 지표 변동의 맥락과 선행/후행 관계를 도출한다.

## 모델

- Claude Opus (다중 지표 교차 추론 필요)

## 트리거

- 일 1회 08:00 KST (수집·1차 분석 완료 후)
- Anomaly Agent에서 CRITICAL 이상 신호 발생 시 비정기 실행

## 분석 대상 상관관계

### 핵심 페어

| 페어 | 관계 가설 | 확인 방법 |
|------|----------|-----------|
| 미국 M2 ↔ BTC | M2 증가 → 유동성 → BTC 상승 (3~6개월 선행) | 시차 상관계수 |
| 미국 금리 ↔ NASDAQ | 금리 인상 → 성장주 약세 | 역상관 추적 |
| 미국 금리 ↔ 원/달러 | 금리 인상 → 달러 강세 → 원화 약세 | 동행 상관 |
| DGS10-DGS2 스프레드 ↔ 경기침체 | 역전 후 12~18개월 내 침체 가능성 | 역전 기간 추적 |
| 한국 M2 ↔ 서울 아파트 | 유동성 증가 → 자산가격 상승 (6~12개월 선행) | 시차 상관계수 |
| KOSPI ↔ 원/달러 | 외국인 매도 → 원화 약세 + KOSPI 하락 | 역상관 추적 |
| 미국 CPI ↔ 금리 기대 | CPI 상승 → 금리 인상 기대 강화 | 동행 상관 |
| 김치프리미엄 ↔ 국내 투자심리 | 김프 상승 → 국내 과열 신호 | 선행 지표 |

## 분석 프로세스

```
1. TimescaleDB에서 전체 지표 최근 12개월 데이터 조회

2. 정량 분석 (코드 기반, LLM 불필요)
   - 피어슨 상관계수 계산 (각 페어별)
   - 시차 상관(lagged correlation): 1개월~12개월 시차별 계산
   - 롤링 상관: 3개월 윈도우 이동 상관계수 (관계 강도 변화 추적)
   - 그레인저 인과성 테스트 (선행 관계 통계 검증)

3. LLM 정성 분석 (Opus)
   프롬프트:
   """
   아래는 오늘의 주요 경제지표 상관관계 분석 결과입니다.

   [정량 분석 결과]
   {correlation_matrix}
   {lagged_correlations}
   {granger_results}

   [최근 주요 이벤트]
   {recent_anomalies}
   {recent_policies}

   다음을 분석하세요:
   1. 현재 가장 주목할 상관관계 변화 (강화/약화)
   2. 기존 패턴과 다른 디커플링 현상
   3. 선행 지표가 시사하는 향후 3개월 방향성
   4. 정책 변화가 기존 상관관계에 미칠 영향

   투자 조언이 아닌, 지표 간 관계에 대한 사실 기반 분석만 제공하세요.
   """

4. 리포트 생성
   {
     date: "2026-03-11",
     highlights: [
       {
         pair: "US_M2 → BTC",
         correlation_current: 0.72,
         correlation_3m_ago: 0.58,
         direction: "strengthening",
         lag_months: 4,
         insight: "M2 반등 이후 4개월 시차로 BTC 상승 패턴 강화 중"
       },
       ...
     ],
     decouplings: [
       {
         pair: "KOSPI ↔ USDKRW",
         expected: "역상관",
         actual: "동행",
         note: "외국인 자금 유입에도 원화 약세 지속. 글로벌 달러 강세 영향"
       }
     ],
     forward_signals: [...],
     confidence: "medium"
   }

5. TimescaleDB 적재 (correlation_reports 테이블)
6. Redis 캐시 갱신: correlation:latest
7. Orchestrator에 완료 이벤트 발행
```

## 출력 스키마

```sql
CREATE TABLE correlation_reports (
  time                TIMESTAMPTZ NOT NULL,
  report_date         DATE UNIQUE,
  highlights          JSONB,
  decouplings         JSONB,
  forward_signals     JSONB,
  correlation_matrix  JSONB,
  confidence          TEXT,
  model_used          TEXT
);

CREATE TABLE correlation_pairs (
  time                TIMESTAMPTZ NOT NULL,
  pair                TEXT NOT NULL,
  correlation         DOUBLE PRECISION,
  lag_months          INTEGER,
  rolling_3m          DOUBLE PRECISION,
  direction           TEXT                -- 'strengthening', 'weakening', 'stable'
);

SELECT create_hypertable('correlation_pairs', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| 데이터 부족 (지표 12개월 미만) | 가용 기간으로 제한, confidence "low" 표시 |
| Opus 응답 불완전 | 정량 분석 결과만으로 리포트 생성 (LLM 분석 부분 "N/A") |
| 상관계수 급변 (±0.3 이상) | Anomaly Agent에 추가 이벤트 발행 |

## 제약 사항

- 상관관계는 인과관계가 아니다. 리포트에 반드시 이 점을 명시한다.
- 투자 추천을 하지 않는다. "M2 상승 시 BTC가 역사적으로 상승했다"까지만.
- Opus 호출은 일 1회로 제한. 비정기 실행 시에도 일 최대 3회.
