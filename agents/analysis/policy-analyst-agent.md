# Policy Analyst Agent

## 역할

Policy Crawler가 수집한 원문을 심층 분석하여, 이전 정책 대비 변화점을 추출하고 시장 영향을 평가한다.

## 모델

- Claude Opus (정책 문서의 뉘앙스 이해, 이전 대비 변화 추론 필요)

## 트리거

- Policy Crawler Agent 완료 이벤트 수신 시 (신규 정책이 있을 때만)
- Orchestrator로부터 수동 실행 명령

## 분석 범위

### 분석 대상

| 문서 유형 | 심층 분석 수준 | 예시 |
|----------|-------------|------|
| 중앙은행 성명서 | 문장 단위 비교 (hawkish/dovish 변화) | FOMC Statement, 한은 금통위 의결문 |
| 정부 정책 발표 | 핵심 수치 변화, 대상 범위 변화 | 추경안, 관세 변경, 부동산 규제 |
| 규제 변화 | 이전 규제 대비 강화/완화 판별 | 금융규제, LTV/DTI 변경 |

### 분석하지 않는 것

- 정치적 논평, 여론
- 개별 기업 실적
- 뉴스 기사 (원문 정책 문서만 대상)

## 분석 프로세스

```
1. Policy Crawler 이벤트에서 신규 정책 목록 수신
   { new_policies: [{ id, country, category, source_url, raw_text_s3_key }] }

2. 이전 동종 정책 조회
   - 같은 기관 + 같은 카테고리의 직전 문서를 DB에서 조회
   - 예: 이번 FOMC 성명서 ↔ 직전 FOMC 성명서

3. 비교 분석 (Opus)
   프롬프트:
   """
   [이전 문서]
   {previous_text}
   날짜: {previous_date}

   [신규 문서]
   {current_text}
   날짜: {current_date}

   다음 형식으로 분석하세요:

   ## 톤 변화
   - 이전 대비 전반적 톤: "더 강경(hawkish)" | "더 완화(dovish)" | "유사"
   - 근거 문장 인용

   ## 핵심 변경 사항
   각 변경에 대해:
   - 변경 내용
   - 이전 문구 → 새 문구
   - 중요도: HIGH / MEDIUM / LOW

   ## 신규 등장 키워드/개념
   - 이전에 없었으나 새로 등장한 표현

   ## 삭제된 키워드/개념
   - 이전에 있었으나 삭제된 표현

   ## 시장 영향 평가
   - 영향받는 자산: [주식, 채권, 암호화폐, 부동산, 환율]별
   - 각 자산에 대한 방향: positive / negative / neutral
   - 영향 시기: 즉시 / 단기(1~3개월) / 중기(3~12개월)

   ## 요약 (3문장 이내)
   """

4. 구조화된 결과 생성
   {
     policy_id: "pol_20260311_fomc",
     country: "US",
     institution: "Federal Reserve",
     category: "통화정책",
     tone_shift: "dovish",
     tone_detail: "'considerable time' → 'patient' 변경, 인플레이션 우려 문구 축소",
     key_changes: [
       {
         description: "인플레이션 전망 하향",
         previous: "inflation remains elevated",
         current: "inflation has eased but remains above target",
         importance: "HIGH"
       }
     ],
     new_keywords: ["data-dependent", "gradual normalization"],
     removed_keywords: ["tightening bias"],
     market_impact: {
       equities: { direction: "positive", timeframe: "즉시" },
       bonds: { direction: "positive", timeframe: "즉시" },
       crypto: { direction: "positive", timeframe: "단기" },
       fx_usdkrw: { direction: "negative", timeframe: "즉시" },
       real_estate: { direction: "neutral", timeframe: "중기" }
     },
     summary: "연준, 인플레이션 둔화 인정하며 비둘기파 전환 시사. 'patient' 표현 도입으로 금리 인하 기대 강화. 주식·채권 우호적, 달러 약세 전환 가능성.",
     analyzed_at: "2026-03-11T09:30:00Z"
   }

5. TimescaleDB 적재 (policy_analyses 테이블)
6. Dashboard Agent에 신규 분석 이벤트 발행
7. Orchestrator에 완료 이벤트 발행
```

## 출력 스키마

```sql
CREATE TABLE policy_analyses (
  time              TIMESTAMPTZ NOT NULL,
  policy_id         TEXT UNIQUE,
  country           TEXT NOT NULL,
  institution       TEXT,
  category          TEXT,
  tone_shift        TEXT,
  tone_detail       TEXT,
  key_changes       JSONB,
  new_keywords      JSONB,
  removed_keywords  JSONB,
  market_impact     JSONB,
  summary           TEXT,
  model_used        TEXT,
  previous_policy_id TEXT REFERENCES economic_policies(source_url)
);

SELECT create_hypertable('policy_analyses', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| 이전 동종 문서 없음 (최초 수집) | 비교 분석 스킵, 단독 요약만 생성 |
| 원문이 너무 길어 컨텍스트 초과 | 섹션별 분할 분석 후 종합 |
| Opus 분석 결과 불완전 | 1회 재시도, 실패 시 Crawler의 초기 분류 결과 그대로 사용 |

## 제약 사항

- 정책 영향 판단은 "역사적 패턴 기반 추정"이며 확정적 예측이 아님을 명시한다.
- Opus 호출 비용이 높으므로, 정책당 1회만 분석. 재분석은 사람이 요청할 때만.
- 정치적 편향 없이 사실 기반 분석만 수행한다.
