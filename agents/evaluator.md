# Evaluator Agent

## 역할

모든 Agent의 산출물 품질, 시스템 전반의 건강 상태, 비용 효율성을 주기적으로 평가하고 개선안을 제시한다.

## 모델

- Claude Opus (전체 시스템을 조망하는 메타 판단 필요)

## 트리거

- 일 1회 22:00 KST (하루 운영 종료 후 종합 평가)
- 주 1회 일요일 22:00 KST (주간 심층 평가)
- Orchestrator에서 에스컬레이션 시 (연속 장애 등)

---

## 평가 영역

### 1. 데이터 품질 평가

| 평가 항목 | 측정 방법 | 기준치 |
|----------|----------|--------|
| 수집 성공률 | 성공 / 전체 실행 | ≥ 99% (일간) |
| 데이터 신선도 | 마지막 성공 수집 ~ 현재 | 각 Agent TTL 이내 |
| 데이터 완전성 | null 필드 비율 | ≤ 5% |
| 이상치 비율 | 통계적 이상치 / 전체 | ≤ 2% (false positive 포함) |
| 소스 다양성 | 단일 소스 의존도 | 주요 지표 2개 이상 소스 |

```
평가 쿼리 예시:
-- 일간 수집 성공률
SELECT agent,
       COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) AS success_rate
FROM agent_executions
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY agent;

-- 데이터 신선도
SELECT indicator,
       MAX(time) AS last_update,
       NOW() - MAX(time) AS staleness
FROM macro_indicators
GROUP BY indicator
HAVING NOW() - MAX(time) > INTERVAL '2 days';
```

### 2. 분석 품질 평가

| 평가 항목 | 측정 방법 | 기준치 |
|----------|----------|--------|
| Anomaly 정밀도 | 사람 검증된 true positive / 전체 알림 | ≥ 80% |
| Anomaly 재현율 | 감지된 실제 이상 / 전체 실제 이상 | ≥ 90% |
| Commentary 수치 정확도 | 브리핑 내 수치 ↔ DB 값 일치율 | 100% |
| Policy 분석 일관성 | 동일 문서 재분석 시 결과 유사도 | ≥ 90% |
| Correlation 예측 적중 | 선행 신호 → 실제 후행 변동 일치 | 추적 (기준 미정) |

#### Anomaly 정밀도 측정 방법

```
1. 주간 단위로 발행된 CRITICAL/WARNING 알림 전수 조사
2. 각 알림에 대해:
   - TRUE_POSITIVE: 실제 의미 있는 시장 이벤트
   - FALSE_POSITIVE: API 오류, 일시적 스파이크, 의미 없는 변동
   - 판별 기준: 이후 1시간 내 뉴스 보도 존재 여부 + 변동 지속 여부
3. 임계치 조정 제안
   - FP 과다 시: 해당 지표의 임계치 상향 제안
   - FN 과다 시: 해당 지표의 임계치 하향 제안
```

### 3. 비용 효율성 평가

| 평가 항목 | 측정 방법 | 기준치 |
|----------|----------|--------|
| 일간 API 비용 | 토큰 사용량 × 단가 | 예산 범위 내 |
| 모델별 비용 비중 | Opus / Sonnet / Haiku 비율 | Opus ≤ 60% |
| 불필요 호출 | 결과 미사용 Agent 실행 | 0회 |
| 캐시 히트율 | Redis HIT / 전체 요청 | ≥ 85% |

```
비용 분석 구조:
{
  daily_cost: {
    opus: { calls: 5, tokens_in: 45000, tokens_out: 12000, cost_usd: 4.20 },
    sonnet: { calls: 12, tokens_in: 85000, tokens_out: 20000, cost_usd: 1.35 },
    haiku: { calls: 1680, tokens_in: 320000, tokens_out: 45000, cost_usd: 0.42 },
    total_usd: 5.97
  },
  monthly_projection: 179.10,
  budget_utilization: "71.6%"
}
```

### 4. 시스템 건강 평가

| 평가 항목 | 측정 방법 | 기준치 |
|----------|----------|--------|
| Agent 가용률 | 정상 Agent / 전체 Agent | 100% |
| 평균 실행 시간 | 각 Agent 평균 소요 시간 | 이전 주 대비 ±20% |
| 에러 추세 | 일간 에러 수 추이 | 감소 또는 유지 |
| 의존성 체인 지연 | 수집 완료 → 분석 완료 | ≤ 10분 |
| DB 용량 | TimescaleDB 사용량 추이 | 월 증가율 모니터링 |

---

## 평가 프로세스

### 일간 평가 (22:00 KST)

```
1. 메트릭 수집
   - agent_executions 테이블에서 일간 통계 조회
   - anomalies 테이블에서 알림 정확도 집계
   - LLM API 사용량 집계
   - Redis 캐시 통계 조회

2. 평가 (Opus)
   프롬프트:
   """
   아래는 오늘의 Agent 시스템 운영 메트릭입니다.

   [수집 현황] {collection_stats}
   [분석 현황] {analysis_stats}
   [비용 현황] {cost_stats}
   [에러 로그] {error_summary}

   다음을 평가하세요:
   1. 전체 건강 상태: HEALTHY / DEGRADED / CRITICAL
   2. 기준 미달 항목과 원인 분석
   3. 즉시 조치가 필요한 사항
   4. 개선 제안 (우선순위 순)
   """

3. 리포트 생성
   {
     date: "2026-03-11",
     type: "daily",
     health_status: "HEALTHY",
     scores: {
       data_quality: 98.5,
       analysis_quality: 92.0,
       cost_efficiency: 88.3,
       system_health: 100.0,
       overall: 94.7
     },
     issues: [],
     recommendations: [
       {
         priority: "LOW",
         target: "Crypto Agent",
         suggestion: "CoinGecko 429 에러 증가 추세. Pro 플랜 전환 검토 권장.",
         expected_impact: "수집 안정성 향상"
       }
     ]
   }

4. TimescaleDB 적재 (evaluations 테이블)
5. Slack으로 일간 리포트 요약 전송
```

### 주간 심층 평가 (일요일 22:00 KST)

일간 평가에 추가로:

```
1. Anomaly 정밀도/재현율 주간 집계
   - 주간 발행된 전체 알림 리뷰
   - FP/FN 분석 → 임계치 조정 제안

2. Correlation 예측 추적
   - 이전 주 Correlation Agent가 발행한 forward_signals
   - 실제 결과와 비교 → 적중률 계산

3. Commentary 품질 샘플링
   - 주간 브리핑 중 2건 랜덤 선택
   - 수치 정확성, 논리 일관성, 가독성 평가

4. 비용 최적화 분석
   - 어떤 Agent를 더 저렴한 모델로 전환 가능한지
   - 불필요하게 자주 실행되는 Agent 식별

5. 주간 트렌드 리포트
   - 이번 주 가장 많이 발생한 이상 유형
   - Agent별 성능 추이 (개선/악화)
   - 다음 주 주의할 이벤트 (경제 캘린더 기반)
```

---

## 출력 스키마

```sql
CREATE TABLE evaluations (
  time              TIMESTAMPTZ NOT NULL,
  eval_date         DATE,
  type              TEXT NOT NULL,       -- 'daily', 'weekly'
  health_status     TEXT,                -- 'HEALTHY', 'DEGRADED', 'CRITICAL'
  scores            JSONB,
  issues            JSONB,
  recommendations   JSONB,
  cost_analysis     JSONB,
  anomaly_accuracy  JSONB,               -- weekly only
  model_used        TEXT
);

SELECT create_hypertable('evaluations', 'time');

-- Agent 실행 이력 (Evaluator가 참조)
CREATE TABLE agent_executions (
  time          TIMESTAMPTZ NOT NULL,
  agent         TEXT NOT NULL,
  status        TEXT NOT NULL,           -- 'success', 'failure', 'timeout'
  duration_ms   INTEGER,
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  model         TEXT,
  error_message TEXT
);

SELECT create_hypertable('agent_executions', 'time');
```

---

## 자동 조치 권한

Evaluator는 직접 시스템을 변경하지 않지만, 다음 제안을 Orchestrator에 전달할 수 있다:

| 제안 유형 | 예시 | 자동 적용 |
|----------|------|-----------|
| 임계치 조정 제안 | "BTC CRITICAL 임계치 5% → 7%로 상향" | X (사람 승인 필요) |
| 스케줄 조정 제안 | "Macro Agent 실행 시간 06:00 → 06:30" | X |
| 모델 전환 제안 | "Policy Monitor를 Sonnet → Haiku로" | X |
| 캐시 TTL 조정 | "부동산 캐시 24h → 12h" | O (Orchestrator 자동 적용) |
| 에러 Agent 재시작 요청 | "Market Agent 비정상, 재시작 요청" | O (Orchestrator 자동 적용) |

---

## 에러 처리

| 에러 | 대응 |
|------|------|
| 메트릭 조회 실패 | 가용 메트릭만으로 부분 평가 수행 |
| Opus 응답 실패 | 정량 메트릭만 기록, 정성 분석은 "N/A" |
| 평가 결과 health_status CRITICAL | Orchestrator에 즉시 에스컬레이션 + 사람에게 알림 |

## 제약 사항

- 평가만 한다. 직접 수정하지 않는다 (캐시 TTL, Agent 재시작 제외).
- Opus 호출은 일 1회 + 주 1회로 제한.
- 평가 결과는 투명하게 기록. 점수 조작이나 은폐 금지.
- 사람이 평가 기준(임계치, 가중치)을 언제든 오버라이드 가능.
