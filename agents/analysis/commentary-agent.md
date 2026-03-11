# Commentary Agent

## 역할

모든 수집·분석 결과를 종합하여, 사람이 읽을 수 있는 "오늘의 매크로 브리핑"을 생성한다.

## 모델

- Claude Opus (자연스러운 한국어 해설, 다중 소스 종합 추론)

## 트리거

- 일 1회 09:00 KST (모든 수집·분석 Agent 완료 후)
- 장중 CRITICAL 이상 신호 발생 시 긴급 브리핑 생성 (일 최대 2회)

## 입력 데이터

각 Agent의 최신 결과를 DB/캐시에서 조회:

| 소스 | 사용 데이터 |
|------|-----------|
| Market Agent | 전일 주가지수 변동, 주요 수치 |
| Crypto Agent | BTC/ETH 시세 변동, 김치프리미엄 |
| Macro Agent | 신규 발표 지표, MoM/YoY 변화 |
| Real Estate Agent | 주간 부동산 동향 |
| Anomaly Agent | 감지된 이상 신호 |
| Correlation Agent | 주목할 상관관계 변화 |
| Policy Analyst Agent | 신규 정책 분석 요약 |

## 생성 프로세스

```
1. 전체 컨텍스트 수집 (DB + Redis)
   - 최근 24시간 수집 데이터 요약
   - 최근 7일 추세
   - 미결 이상 신호
   - 신규 정책 분석

2. 브리핑 생성 (Opus)
   프롬프트:
   """
   당신은 매크로 경제 대시보드의 일일 브리핑 작성자입니다.
   전문적이되 읽기 쉬운 한국어로 작성하세요.

   [오늘의 데이터]
   {daily_summary}

   [이상 신호]
   {anomalies}

   [상관관계 하이라이트]
   {correlation_highlights}

   [신규 정책]
   {policy_analyses}

   아래 형식으로 브리핑을 작성하세요:

   ## 한줄 요약
   오늘의 핵심을 1문장으로.

   ## 시장 동향
   - 글로벌 증시 (S&P500, NASDAQ, Dow)
   - 한국 증시 (KOSPI)
   - 환율 (원/달러)
   각 2~3문장. 숫자 포함.

   ## 암호화폐
   - BTC, ETH 동향
   - 김치프리미엄 상황
   2~3문장.

   ## 매크로 지표
   신규 발표된 지표가 있으면 해설. 없으면 "금일 신규 발표 없음" 명시.

   ## 부동산
   주간 동향 변화가 있을 때만 포함.

   ## 정책 업데이트
   신규 정책이 있을 때만 포함. Policy Analyst 분석 결과를 쉬운 말로 풀어서.

   ## 주목 포인트
   - 이상 신호, 상관관계 변화 등에서 사용자가 특히 주목할 내용
   - 이번 주 예정된 주요 일정 (FOMC, 금통위, 지표 발표 등)

   규칙:
   - 투자 추천 금지. "~할 수 있습니다" 같은 가능성 표현만 사용
   - 모든 수치에 출처 명시
   - 확인되지 않은 추측 금지
   - 200~400단어 범위
   """

3. 품질 검증 (자동)
   - 언급된 수치가 실제 데이터와 일치하는지 교차 검증
   - 금지 표현 필터: "반드시 오를", "매수/매도 추천", "확실히" 등
   - 불일치/금지 표현 발견 시 재생성 (최대 1회)

4. 결과 저장
   {
     date: "2026-03-11",
     type: "daily",              -- "daily" or "urgent"
     headline: "연준 비둘기파 전환에 글로벌 증시 반등, BTC 9만 달러 돌파",
     sections: { ... },
     word_count: 328,
     data_sources_used: ["market", "crypto", "macro", "policy"],
     generated_at: "2026-03-11T09:00:30Z"
   }

5. TimescaleDB 적재 (commentaries 테이블)
6. Dashboard Agent에 신규 브리핑 이벤트 발행
7. Orchestrator에 완료 이벤트 발행
```

## 긴급 브리핑 (장중)

Anomaly Agent에서 CRITICAL 신호 발생 시:

```
프롬프트 추가:
"""
[긴급 이벤트]
{critical_anomaly}

위 이벤트에 대해 3~5문장의 긴급 브리핑을 작성하세요.
- 무슨 일이 일어났는가 (수치 포함)
- 가능한 원인 (확인된 것만)
- 다른 지표에 미칠 파급 영향
"""
```

## 출력 스키마

```sql
CREATE TABLE commentaries (
  time            TIMESTAMPTZ NOT NULL,
  report_date     DATE,
  type            TEXT NOT NULL,     -- 'daily', 'urgent'
  headline        TEXT,
  content         JSONB,             -- 섹션별 구조화된 내용
  full_text       TEXT,              -- 마크다운 전문
  word_count      INTEGER,
  sources_used    JSONB,
  model_used      TEXT
);

SELECT create_hypertable('commentaries', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| 데이터 부족 (일부 Agent 미완료) | 가용 데이터만으로 브리핑 생성, "일부 데이터 미수신" 표시 |
| 수치 교차 검증 실패 | 해당 수치 제거 후 재생성 |
| 금지 표현 감지 | 해당 문장 수정 후 재생성 |
| Opus 응답 실패 | 전일 브리핑에 "금일 브리핑 지연" 공지 추가 |

## 제약 사항

- 투자 조언을 하지 않는다. 사실과 역사적 패턴만 서술.
- 일일 브리핑 1회 + 긴급 최대 2회. Opus 비용 관리.
- 생성된 브리핑은 서비스 초기에는 사람 검수 후 게시. 안정화 후 자동 게시 전환.
