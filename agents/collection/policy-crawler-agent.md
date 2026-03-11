# Policy Crawler Agent

## 역할

미국·한국의 주요 경제 정책 발표, 중앙은행 성명서, 정부 정책 브리핑을 수집하고 원문을 구조화한다.

## 모델

- Claude Sonnet (텍스트 이해와 구조화 필요)

## 트리거

- 4시간 간격
- FOMC 회의일 / 한은 금통위일에는 1시간 간격
- Orchestrator로부터 수동 실행 명령

## 데이터 소스

### 미국

| 소스 | URL / 방법 | 내용 |
|------|-----------|------|
| Federal Reserve | federalreserve.gov/newsevents | FOMC 성명서, 의사록, 연설 |
| White House | whitehouse.gov/briefing-room | 경제 관련 행정명령, 정책 발표 |
| Treasury Dept. | home.treasury.gov/news | 재정정책, 국채 발행 계획 |
| BLS (노동통계국) | bls.gov/news.release | 고용, CPI 발표 보도자료 |

### 한국

| 소스 | URL / 방법 | 내용 |
|------|-----------|------|
| 한국은행 | bok.or.kr/portal/bbs | 금통위 의결사항, 통화정책 보고서 |
| 기획재정부 | mosf.go.kr/nw | 경제정책방향, 세제 개편, 추경 |
| 국토교통부 | molit.go.kr | 부동산 정책, 주택공급 발표 |
| 금융위원회 | fsc.go.kr | 금융정책, 규제 변화 |

## 수집 프로세스

```
1. 각 소스의 뉴스/보도자료 페이지 크롤링
   - RSS 피드 우선 사용 (있는 경우)
   - 없으면 HTML 크롤링 → 최신 게시물 목록 추출

2. 신규 게시물 감지
   - 마지막 수집 시점 이후 게시물만 필터링
   - URL 기반 중복 체크 (이미 수집한 URL은 스킵)

3. 원문 수집
   - 게시물 상세 페이지 접근
   - HTML → 텍스트 추출 (boilerplate 제거)
   - PDF 첨부파일이 있으면 다운로드 → 텍스트 추출

4. 구조화 (Sonnet 활용)
   프롬프트:
   """
   다음 정책 문서를 분석하여 JSON으로 구조화하세요.
   - country: "US" or "KR"
   - institution: 발표 기관
   - category: "통화정책" | "재정정책" | "산업정책" | "부동산정책" | "무역정책" | "금융규제"
   - title: 핵심 제목 (30자 이내)
   - summary: 핵심 내용 요약 (100자 이내)
   - key_changes: 이전 대비 변경 사항 리스트
   - impact: "positive" | "negative" | "neutral" (시장 영향 판단)
   - affected_sectors: 영향받는 섹터 리스트
   - date: 발표일
   """

5. TimescaleDB 적재
   - economic_policies 테이블에 INSERT
   - 원문은 S3에 별도 저장 (TEXT 컬럼은 요약만)

6. Redis 캐시 갱신
   - key: policy:latest:{country}
   - TTL: 14400초 (4시간)

7. Orchestrator에 완료 이벤트 발행
   - 신규 정책 수 포함: { new_policies: 2, countries: ["US", "KR"] }
```

## 출력 스키마

```sql
CREATE TABLE economic_policies (
  time              TIMESTAMPTZ NOT NULL,
  country           TEXT NOT NULL,
  institution       TEXT NOT NULL,
  category          TEXT NOT NULL,
  title             TEXT,
  summary           TEXT,
  key_changes       JSONB,
  impact            TEXT,
  affected_sectors  JSONB,
  source_url        TEXT UNIQUE,
  raw_text_s3_key   TEXT,
  collected_at      TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('economic_policies', 'time');
CREATE INDEX idx_policy_country ON economic_policies (country, time DESC);
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| 크롤링 대상 사이트 구조 변경 | 파싱 실패 로그 기록, Orchestrator에 알림, 사람이 크롤러 수정 |
| PDF 텍스트 추출 실패 | 메타데이터만 적재 (제목, 날짜, URL), 원문은 "추출 실패" 표시 |
| Sonnet 구조화 결과 불완전 | 필수 필드 누락 시 재시도 1회, 여전히 실패 시 raw 상태로 적재 |
| Rate limit (크롤링 대상) | 요청 간격 5초 이상 유지, 차단 시 해당 소스 일시 중단 |

## 제약 사항

- 크롤링 대상 사이트의 robots.txt를 준수한다.
- 요청 간격 최소 5초. 대상 서버에 부하를 주지 않는다.
- 정책의 영향 판단(impact)은 초기 분류용이며, 정밀 분석은 Policy Analyst Agent가 수행.
- 저작권 있는 원문 전체를 사용자에게 노출하지 않는다. 요약과 링크만 제공.
