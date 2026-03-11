# Agent 협업 워크플로우

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                      Orchestrator Agent                         │
│              스케줄링 · 의존성 관리 · 장애 대응                      │
└──────┬──────────────┬──────────────┬───────────────┬────────────┘
       │              │              │               │
  ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌─────▼─────┐
  │  수집    │   │  분석    │   │  전달    │   │  평가     │
  │  Layer   │──→│  Layer   │──→│  Layer   │   │  Layer    │
  └─────────┘   └─────────┘   └─────────┘   └───────────┘
       │              │              │               │
  5 Agents       4 Agents       2 Agents        1 Agent
```

---

## 일간 타임라인

하루 동안 Agent들이 어떤 순서로 동작하는지 시간순 기록.

### 00:00~06:00 KST — 야간 수집

```
[상시] Crypto Agent ────── 1분 간격 BTC/ETH 수집 (24/7)
[상시] Market Agent ────── 미국장 22:30~05:00 KST 동안 5분 간격
         │
         ▼
[이벤트] Anomaly Agent ─── Market/Crypto 완료 시 이상치 검사
         │
         ▼ (CRITICAL 시)
[이벤트] Alert Agent ────── 알림 발송 (Quiet Hours: Email/Push 제외)
```

### 06:00 KST — 경제지표 수집

```
[06:00] Macro Agent 실행
        ├── FRED API → 미국 M2, 금리, CPI 등
        └── BOK API → 한국 M2, 기준금리 등
        │
        ▼
[06:05] Anomaly Agent ─── 신규 발표 지표 이상치 검사
```

### 07:00 KST — 부동산 수집

```
[07:00] Real Estate Agent 실행
        ├── 공공데이터포털 → 아파트가격지수
        └── 국토교통부 → 실거래가
```

### 08:00 KST — 분석

```
[08:00] Correlation Agent 실행
        ├── 입력: 전체 시계열 데이터 (최근 12개월)
        ├── 입력: Anomaly Agent 최근 감지 내역
        └── 출력: 상관관계 리포트, 주목 신호
```

### 08:00 KST — 정책 수집·분석 (4시간 간격)

```
[08:00] Policy Crawler Agent 실행
        ├── 연준, 한은, 기재부 등 크롤링
        └── 신규 정책 감지 시:
             │
             ▼
        Policy Analyst Agent 실행
        ├── 이전 정책 대비 변화 분석
        └── 시장 영향 평가
```

### 09:00 KST — 일일 브리핑 생성

```
[09:00] Commentary Agent 실행
        ├── 입력: Market, Crypto, Macro, RE 최신 데이터
        ├── 입력: Anomaly 감지 내역
        ├── 입력: Correlation 리포트
        ├── 입력: Policy 분석 결과
        └── 출력: "오늘의 매크로 브리핑"
             │
             ▼
        Dashboard Agent ─── 브리핑 캐시 갱신
```

### 09:00~15:30 KST — 한국장

```
[09:00] Market Agent ────── KOSPI 5분 간격 수집 시작
        │
        ▼
[이벤트] Anomaly Agent ─── 실시간 이상치 검사
        │
        ▼ (이상 시)
[이벤트] Alert Agent ────── 알림 발송
[이벤트] Commentary Agent ─ 긴급 브리핑 (CRITICAL 시)
```

### 22:00 KST — 일간 평가

```
[22:00] Evaluator Agent 실행
        ├── 전체 Agent 메트릭 수집
        ├── 데이터 품질 평가
        ├── 분석 품질 평가
        ├── 비용 효율성 평가
        └── 출력: 일간 평가 리포트 → Slack 전송
```

### 22:30 KST — 미국장 시작

```
[22:30] Market Agent ────── S&P500, NASDAQ, DJI 5분 간격 수집 시작
        ... (다음 날 05:00까지 반복)
```

---

## 이벤트 기반 워크플로우

시간 스케줄과 별도로, 이벤트에 의해 트리거되는 워크플로우.

### Flow 1: 정상 수집 → 갱신

```
[수집 Agent 완료]
       │
       ▼
Orchestrator가 이벤트 수신
       │
       ├──→ Anomaly Agent 실행 (이상치 검사)
       │         │
       │         └──→ 이상 없음 → 종료
       │
       └──→ Dashboard Agent (캐시 갱신)
```

### Flow 2: 이상 감지 → 알림

```
[Anomaly Agent: CRITICAL 감지]
       │
       ▼
Orchestrator가 이벤트 수신
       │
       ├──→ Alert Agent 실행 (알림 발송)
       │         │
       │         ├──→ Slack 알림
       │         ├──→ Discord 알림
       │         ├──→ Email (Quiet Hours 아닐 때)
       │         └──→ 인앱 배너
       │
       └──→ Commentary Agent (긴급 브리핑, 일 최대 2회)
                  │
                  └──→ Dashboard Agent (브리핑 캐시 갱신)
```

### Flow 3: 정책 발표 → 분석

```
[Policy Crawler: 신규 정책 감지]
       │
       ▼
Orchestrator가 이벤트 수신
       │
       └──→ Policy Analyst Agent 실행
                  │
                  ├──→ 이전 정책 대비 변화 분석
                  ├──→ 시장 영향 평가
                  │
                  ▼
            Dashboard Agent (정책 위젯 갱신)
                  │
                  ▼
            Alert Agent (신규 정책 알림)
```

### Flow 4: 수집 실패 → 복구

```
[수집 Agent 실패]
       │
       ▼
Orchestrator가 이벤트 수신
       │
       ├──→ 재시도 #1 (30초 후)
       │         │
       │    실패 ──→ 재시도 #2 (1분 후)
       │                  │
       │             실패 ──→ 재시도 #3 (5분 후)
       │                           │
       │                      실패 ──→ 폴백 모드 진입
       │                                   │
       │                                   ├──→ 대체 소스 시도
       │                                   ├──→ stale 플래그 설정
       │                                   └──→ 사람에게 알림
       │
       └──→ Dashboard Agent (stale 상태 반영)
```

### Flow 5: 평가 → 개선

```
[Evaluator: 일간 평가 완료]
       │
       ▼
Orchestrator가 리포트 수신
       │
       ├──→ 자동 조치 가능 항목
       │         │
       │         ├──→ 캐시 TTL 조정 (자동)
       │         └──→ 에러 Agent 재시작 (자동)
       │
       └──→ 사람 승인 필요 항목
                  │
                  └──→ Slack으로 제안 전송
                            │
                            ▼
                       사람이 승인/거부
                            │
                       승인 시 Orchestrator가 적용
```

---

## Agent 간 통신 규약

### 이벤트 메시지 형식

모든 Agent 간 통신은 아래 형식을 따른다:

```json
{
  "event_id": "evt_20260311_143022_market",
  "source_agent": "market-agent",
  "event_type": "collection.complete",
  "timestamp": "2026-03-11T14:30:22Z",
  "payload": {
    "symbols": ["SPX", "IXIC", "KS11", "DJI"],
    "records_inserted": 4,
    "duration_ms": 2340
  },
  "metadata": {
    "retry_count": 0,
    "model_used": "haiku",
    "tokens_used": { "input": 450, "output": 120 }
  }
}
```

### 이벤트 타입 목록

| event_type | 발행 Agent | 구독 Agent |
|-----------|-----------|-----------|
| `collection.complete` | 수집 Agents | Orchestrator, Anomaly, Dashboard |
| `collection.failed` | 수집 Agents | Orchestrator |
| `anomaly.detected` | Anomaly | Orchestrator, Alert, Commentary |
| `anomaly.clear` | Anomaly | Dashboard |
| `policy.new` | Policy Crawler | Orchestrator, Policy Analyst |
| `analysis.complete` | 분석 Agents | Orchestrator, Dashboard |
| `commentary.ready` | Commentary | Dashboard |
| `alert.sent` | Alert | Orchestrator (이력 기록) |
| `evaluation.complete` | Evaluator | Orchestrator |
| `system.health_change` | Evaluator | Orchestrator, Alert |

### 메시지 큐

- **Redis Streams** 사용
- 각 Agent는 Consumer Group으로 구독
- 미처리 메시지는 PEL(Pending Entries List)에 보관
- 24시간 이상 미처리 시 Dead Letter Queue로 이동

---

## 데이터 저장소 역할 분담

```
┌─────────────────────────────────────────┐
│           TimescaleDB (영구 저장)         │
│                                         │
│  시계열 데이터    : 시세, 지표, 부동산       │
│  분석 결과       : 상관관계, 정책 분석       │
│  산출물         : 브리핑, 평가 리포트        │
│  운영 이력       : Agent 실행 로그          │
│  알림 이력       : 발송된 알림 기록          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Redis (캐시 + 메시징)            │
│                                         │
│  API 응답 캐시   : api:response:*        │
│  최신값 캐시     : crypto:latest:*        │
│  중복 방지       : alert:dedup:*          │
│  이벤트 큐       : Redis Streams          │
│  실시간 알림     : Pub/Sub (인앱 배너)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           S3 (대용량 저장)                │
│                                         │
│  정책 원문       : PDF, HTML 원본         │
│  백업           : DB 일간 백업             │
└─────────────────────────────────────────┘
```

---

## 장애 등급 및 대응 매트릭스

| 등급 | 정의 | 예시 | 대응 | 사람 개입 |
|------|------|------|------|----------|
| **P0** | 전체 서비스 중단 | DB 장애, Orchestrator 다운 | 즉시 자동 알림 + 사람 즉시 대응 | 필수 |
| **P1** | 핵심 기능 장애 | Market/Crypto 수집 30분+ 중단 | 자동 폴백 + 사람 알림 | 1시간 내 |
| **P2** | 부분 기능 장애 | 1개 소스 API 장애, 분석 지연 | 자동 폴백, stale 표시 | 다음 영업일 |
| **P3** | 경미한 이슈 | 캐시 미스 증가, 비용 초과 | Evaluator 리포트에 기록 | 주간 리뷰 |

---

## 배포 및 변경 관리

### Agent 코드 변경 시

```
1. 개발자가 Agent 코드 수정
2. 스테이징 환경에서 테스트
   - 단위 테스트: Agent 개별 동작 확인
   - 통합 테스트: 이벤트 체인 정상 동작 확인
3. Evaluator가 스테이징 결과 평가
4. 프로덕션 배포
   - 한 번에 1개 Agent만 배포 (롤링)
   - 배포 후 1시간 모니터링
   - 이상 시 즉시 롤백
```

### 임계치/설정 변경 시

```
1. Evaluator가 변경 제안 (또는 사람이 직접)
2. Orchestrator에 변경 요청
3. 변경 이력 기록 (config_changes 테이블)
4. 적용 후 Evaluator가 다음 평가에서 효과 측정
```

---

## 주간 운영 사이클

```
월요일: 주간 시작, 이전 주 평가 리포트 기반 개선 사항 적용
화~금: 일상 운영, 일간 평가 누적
토요일: 한국장 휴장, 미국장만 모니터링
일요일 22:00: Evaluator 주간 심층 평가
         │
         ├── Anomaly 정밀도/재현율 주간 집계
         ├── Correlation 예측 적중률 추적
         ├── 비용 최적화 분석
         └── 다음 주 주요 이벤트 목록 생성
```

---

## 확장 포인트

추후 기능 확장 시 워크플로우에 삽입되는 지점:

| 기능 | 삽입 위치 | 관련 Agent |
|------|----------|-----------|
| 보고서 수집 (컨설팅/금융) | 수집 Layer 신규 Agent | Report Ingestion Agent |
| 섹터 추천 | 분석 Layer 신규 Agent | Sector Signal Agent |
| 사용자 개인화 | 전달 Layer 확장 | Dashboard Agent 확장 |
| 모바일 푸시 | Alert Agent 채널 추가 | Alert Agent |
| 다국어 브리핑 | Commentary Agent 확장 | Commentary Agent |
