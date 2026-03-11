# Alert Agent

## 역할

Anomaly Agent에서 발행한 이상 신호를 받아 사용자에게 적절한 채널로 알림을 전달한다.

## 모델

- Claude Haiku (빠른 응답, 간결한 메시지 생성)

## 트리거

- Anomaly Agent에서 CRITICAL / WARNING 이벤트 수신 시
- Policy Analyst Agent에서 신규 정책 분석 완료 시
- Commentary Agent에서 긴급 브리핑 생성 시

## 알림 채널

| 채널 | 용도 | 설정 |
|------|------|------|
| Slack Webhook | 팀 내부 알림 | `SLACK_WEBHOOK_URL` |
| Discord Webhook | 커뮤니티 알림 | `DISCORD_WEBHOOK_URL` |
| Email (SendGrid) | 구독자 알림 | `SENDGRID_API_KEY` |
| Web Push | 브라우저 푸시 | Service Worker 기반 |
| 대시보드 내 배너 | 인앱 알림 | Redis pub/sub |

## 알림 규칙

### 채널별 필터

| 심각도 | Slack | Discord | Email | Push | 인앱 |
|--------|-------|---------|-------|------|------|
| CRITICAL | O | O | O | O | O |
| WARNING | O | O | X | X | O |
| INFO | X | X | X | X | O |

### 중복 방지

- 동일 지표에 대해 **1시간 내 동일 심각도 알림 최대 1회**
- CRITICAL → WARNING 순으로 이미 알림 발송된 경우 WARNING 생략
- 동시 다발 이상 (3건 이상): 개별 알림 대신 종합 알림 1건

### Quiet Hours

- 한국 시간 23:00~07:00: Email, Push 발송 중단 (Slack, Discord, 인앱은 유지)
- 사용자별 개인 설정 가능 (추후)

## 알림 생성 프로세스

```
1. 이벤트 수신
   {
     type: "anomaly",
     anomaly_id: "anom_20260311_001",
     indicator: "SPX",
     severity: "CRITICAL",
     change_pct: 2.98,
     analysis: "S&P500 3% 근접 급등..."
   }

2. 중복 체크
   - Redis에서 최근 1시간 내 동일 indicator + severity 알림 이력 확인
   - 중복이면 스킵

3. 메시지 생성 (Haiku)
   채널별 포맷 차이:

   [Slack/Discord]
   🚨 *CRITICAL: S&P 500 급등*
   현재: 5,234.18 (▲2.98%)
   전일 종가: 5,082.71
   분석: FOMC 비둘기파 발언 이후 반응으로 추정
   ──────
   📊 대시보드에서 확인 → {dashboard_url}

   [Email]
   제목: [매크로 대시보드] S&P 500 3% 급등 알림
   본문: 브리핑 형식의 상세 내용

   [인앱 배너]
   S&P 500 ▲2.98% 급등 | 클릭하여 상세 확인

4. 채널별 발송
   - 각 채널 API 호출
   - 실패 시 1회 재시도, 여전히 실패 시 로그만 기록

5. 알림 이력 기록
   - Redis: 중복 방지용 (TTL 1시간)
   - TimescaleDB: 영구 이력

6. Orchestrator에 완료 이벤트 발행
```

## 출력 스키마

```sql
CREATE TABLE alert_history (
  time          TIMESTAMPTZ NOT NULL,
  alert_id      TEXT UNIQUE,
  anomaly_id    TEXT,
  indicator     TEXT,
  severity      TEXT,
  channels_sent JSONB,           -- ["slack", "discord", "email"]
  message       TEXT,
  delivered     BOOLEAN DEFAULT TRUE,
  failed_channels JSONB
);

SELECT create_hypertable('alert_history', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| Slack Webhook 실패 | 1회 재시도 → 실패 시 Discord로 폴백 |
| Email 발송 실패 | 로그 기록, 다음 알림에 "이전 알림 미전달" 표시 |
| 전체 채널 장애 | 인앱 배너만으로 폴백 (Redis pub/sub는 자체 인프라) |
| 알림 폭주 (1시간 내 10건 이상) | 개별 중단, "다수 이상 신호 감지" 종합 알림 1건 발송 |

## 제약 사항

- 알림 메시지에 투자 조언을 포함하지 않는다. 사실과 수치만.
- 사용자의 알림 설정(채널, Quiet Hours)을 존중한다.
- 알림 빈도가 과도하면 사용자 피로. 일 최대 CRITICAL 5건, WARNING 10건 제한.
