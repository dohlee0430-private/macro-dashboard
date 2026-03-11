# Anomaly Agent

## 역할

수집된 데이터에서 급등락, 이상치, 통계적 이탈을 감지하여 Alert Agent에 신호를 발행한다.

## 모델

- Claude Sonnet

## 트리거

- 수집 Layer Agent(Market, Crypto, Macro) 완료 이벤트 수신 시
- Orchestrator로부터 수동 실행 명령

## 감지 규칙

### 즉시 알림 (Critical)

| 대상 | 조건 | 심각도 |
|------|------|--------|
| 주가지수 | 전일 대비 ±3% 이상 | CRITICAL |
| BTC/ETH | 1시간 내 ±5% 이상 | CRITICAL |
| 원/달러 환율 | 전일 대비 ±2% 이상 | CRITICAL |
| 장단기 금리 | 역전(DGS2 > DGS10) 발생/해소 | CRITICAL |

### 주의 알림 (Warning)

| 대상 | 조건 | 심각도 |
|------|------|--------|
| 주가지수 | 전일 대비 ±1.5% 이상 | WARNING |
| BTC/ETH | 24시간 내 ±8% 이상 | WARNING |
| M2 증가율 | MoM 변화율이 직전 6개월 평균의 2배 이상 | WARNING |
| 거래량 | 20일 평균 대비 3배 이상 | WARNING |
| 김치프리미엄 | ±5% 이상 | WARNING |
| 부동산 | 주간 변동률 ±0.5% 이상 (전국 기준) | WARNING |

### 정보 알림 (Info)

| 대상 | 조건 | 심각도 |
|------|------|--------|
| 신규 경제지표 발표 | FRED/BOK에서 새 데이터 감지 | INFO |
| 연속 상승/하락 | 5거래일 연속 동일 방향 | INFO |

## 감지 프로세스

```
1. 트리거 이벤트에서 대상 Agent와 데이터 종류 확인

2. TimescaleDB에서 비교 데이터 조회
   - 전일/전주/전월 값
   - 이동평균 (20일, 60일)
   - 표준편차 (볼린저 밴드 기준: 2σ 이탈)

3. 규칙 기반 1차 필터링
   - 위 테이블의 임계치 기반 판별
   - 해당 없으면 종료 (대부분 여기서 끝남)

4. LLM 2차 분석 (1차 필터 통과 시에만)
   프롬프트:
   """
   다음 이상 신호를 분석하세요:
   - 지표: {indicator}
   - 현재값: {value}, 전일: {prev}, 변화율: {change_pct}%
   - 최근 20일 평균: {avg_20d}, 표준편차: {std_20d}
   - 동시 발생 이상: {concurrent_anomalies}

   판단:
   1. API 오류 가능성 (비정상적 값인가?)
   2. 실제 시장 이벤트 가능성
   3. 관련 있을 수 있는 다른 지표 변화
   4. 권장 대응: "알림 발송" or "무시" or "모니터링 강화"
   """

5. 이상 신호 발행
   {
     anomaly_id: "anom_20260311_001",
     indicator: "SPX",
     severity: "CRITICAL",
     current_value: 5234.18,
     reference_value: 5082.71,
     change_pct: 2.98,
     analysis: "S&P500 3% 근접 급등. FOMC 비둘기파 발언 이후 반응으로 추정.",
     recommendation: "알림 발송",
     detected_at: "2026-03-11T10:05:30Z"
   }

6. Alert Agent에 이벤트 발행 (severity CRITICAL/WARNING만)
7. TimescaleDB anomalies 테이블에 기록 (전체)
8. Orchestrator에 완료 이벤트 발행
```

## 출력 스키마

```sql
CREATE TABLE anomalies (
  time            TIMESTAMPTZ NOT NULL,
  anomaly_id      TEXT UNIQUE,
  indicator       TEXT NOT NULL,
  severity        TEXT NOT NULL,      -- 'CRITICAL', 'WARNING', 'INFO'
  current_value   DOUBLE PRECISION,
  reference_value DOUBLE PRECISION,
  change_pct      DOUBLE PRECISION,
  analysis        TEXT,
  recommendation  TEXT,
  alerted         BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('anomalies', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| 비교 데이터 부족 (서비스 초기) | 절대값 임계치만 적용, 통계적 분석 스킵 |
| LLM 분석 실패 | 규칙 기반 결과만으로 판단, LLM 분석 필드 "N/A" |
| 동시 다발 이상 (5건 이상) | 개별 알림 대신 종합 알림 1건으로 묶어서 발행 |

## 제약 사항

- 이상 감지만 한다. "왜 올랐는가"에 대한 심층 분석은 Correlation Agent/Commentary Agent 영역.
- API 오류로 인한 허위 이상(false positive) 최소화가 핵심. 의심 시 "모니터링 강화" 권장.
- 임계치는 초기 설정값이며, 운영 데이터 축적 후 사람이 조정해야 한다.
