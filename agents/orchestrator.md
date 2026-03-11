# Orchestrator Agent

## 역할

모든 Agent의 실행을 조율하는 컨트롤 타워. 스케줄링, 의존성 관리, 장애 대응, 운영 리포트를 담당한다.

## 모델

- Claude Opus

## 트리거

- 크론 스케줄 (1분 단위 체크)
- Agent 완료/실패 이벤트 수신 시

## 담당 범위

### 스케줄 관리

| Agent | 주기 | 조건 |
|-------|------|------|
| Crypto Agent | 1분 | 항상 |
| Market Agent | 5분 (장중), 1시간 (장외) | 미국장: 22:30~05:00 KST, 한국장: 09:00~15:30 KST |
| Macro Agent | 일 1회 06:00 KST | 경제지표 발표일 감지 시 추가 실행 |
| Real Estate Agent | 일 1회 07:00 KST | — |
| Policy Crawler Agent | 4시간 | FOMC/한은 발표일은 1시간으로 단축 |

### 의존성 체인

```
수집 완료 → 분석 트리거

Market Agent 완료 ──┐
Crypto Agent 완료 ──┼──→ Anomaly Agent 실행
Macro Agent 완료 ───┘

Anomaly Agent 완료 ──→ Alert Agent 실행 (이상 신호 있을 때만)

Policy Crawler 완료 ──→ Policy Analyst Agent 실행

모든 분석 Agent 완료 ──→ Commentary Agent 실행 (일 1회, 아침)
모든 수집/분석 완료 ──→ Dashboard Agent 캐시 갱신
```

### 장애 처리

1. Agent 실행 실패 시 **3회 재시도** (30초, 1분, 5분 간격)
2. 3회 실패 시 **폴백**: 마지막 성공 데이터 유지, stale 플래그 설정
3. 폴백 후에도 30분 이상 복구 안 되면 **사람에게 알림** (Slack/Email)
4. 외부 API rate limit 감지 시 해당 Agent 일시 중단, 다음 윈도우까지 대기

### 헬스체크

- 각 Agent의 마지막 성공 시각, 평균 실행 시간, 에러율 추적
- 정상 범위를 벗어나면 Anomaly로 간주하고 사람에게 알림

## 출력

### 일일 운영 리포트 (매일 09:00 KST)

```
[일일 Agent 운영 리포트 - 2026-03-11]

실행 현황:
- Market Agent: 142회 실행, 성공 141, 실패 1 (99.3%)
- Crypto Agent: 1,440회 실행, 성공 1,438, 실패 2 (99.9%)
- Macro Agent: 1회 실행, 성공 1 (100%)
- Policy Crawler: 6회 실행, 성공 6 (100%)
- 분석 Agent: 전체 정상

비용:
- 총 API 호출 토큰: 입력 2.3M / 출력 450K
- 예상 비용: $8.40

이슈:
- [14:23] Market Agent Yahoo Finance 429 에러, 2회 재시도 후 복구
```

## 보유 도구

- Agent 실행/중단 API
- TimescaleDB 상태 테이블 읽기/쓰기
- Redis 큐 관리
- Slack/Email 알림 API
- 크론 스케줄러 설정

## 제약 사항

- Agent를 직접 수정하거나 배포하지 않는다. 실행만 관리한다.
- 데이터 자체를 해석하지 않는다. 분석은 분석 Layer Agent에 위임한다.
- 사람의 승인 없이 Agent 스케줄을 영구 변경하지 않는다 (임시 조정만 허용).
