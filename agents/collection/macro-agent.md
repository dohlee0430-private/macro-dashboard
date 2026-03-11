# Macro Agent

## 역할

미국·한국의 핵심 거시경제 지표(M2 통화량, 기준금리, CPI, PMI 등)를 수집한다.

## 모델

- Claude Haiku (정기 수집)
- Claude Sonnet으로 에스컬레이션 (신규 발표 감지 시 해석 보조)

## 트리거

- 일 1회 06:00 KST
- 경제지표 캘린더상 발표일에 추가 실행 (Orchestrator가 판단)

## 데이터 소스

### 미국 지표

| 지표 | FRED Series ID | 주기 | 설명 |
|------|---------------|------|------|
| M2 통화량 | M2SL | 월 | 계절조정, 10억 달러 |
| 연방기금금리 | FEDFUNDS | 월 | 실효 연방기금금리 |
| CPI (전체) | CPIAUCSL | 월 | 소비자물가지수 |
| Core CPI | CPILFESL | 월 | 식품·에너지 제외 |
| 실업률 | UNRATE | 월 | U-3 실업률 |
| PMI 제조업 | MANEMP | 월 | ISM 제조업 PMI 근사 |
| 10년 국채 금리 | DGS10 | 일 | 장기 금리 |
| 2년 국채 금리 | DGS2 | 일 | 단기 금리 (역전 모니터링) |

API: `https://api.stlouisfed.org/fred/series/observations`
인증: `FRED_API_KEY` (무료 발급)

### 한국 지표

| 지표 | BOK 통계표 코드 | 주기 | 설명 |
|------|----------------|------|------|
| M2 광의통화 | 101Y004 | 월 | 계절조정, 조원 |
| 기준금리 | 722Y001 | 수시 | 한국은행 기준금리 |
| CPI | 901Y009 | 월 | 소비자물가지수 |
| 실업률 | 901Y027 | 월 | 경제활동인구조사 |

API: `https://ecos.bok.or.kr/api/StatisticSearch/{apiKey}/json/kr/...`
인증: `BOK_API_KEY` (무료 발급)

## 수집 프로세스

```
1. FRED API 호출 (미국 지표 일괄)
   각 시리즈별로:
   GET /fred/series/observations
   ?series_id={id}&api_key={key}&file_type=json
   &sort_order=desc&limit=60

2. BOK API 호출 (한국 지표 일괄)
   각 통계표별로:
   GET /api/StatisticSearch/{key}/json/kr/1/100/{table_code}/MM/{start}/{end}/

3. 데이터 정규화
   {
     indicator: "US_M2",
     value: 21423.5,
     unit: "Billions USD",
     date: "2026-01-01",
     mom_change_pct: 0.32,
     yoy_change_pct: 4.18,
     source: "FRED",
     series_id: "M2SL",
     collected_at: "2026-03-11T06:00:00Z"
   }

4. 변화율 계산
   - MoM: (현월 - 전월) / 전월 * 100
   - YoY: (현월 - 12개월전) / 12개월전 * 100
   - 장단기 금리차: DGS10 - DGS2 (역전 여부 플래그)

5. TimescaleDB 적재
   - macro_indicators 테이블에 INSERT
   - 신규 데이터 발표 감지 시 new_release 이벤트 발행

6. Redis 캐시 갱신
   - key: macro:latest:{indicator}
   - TTL: 86400초 (1일)

7. Orchestrator에 완료 이벤트 발행
   - 신규 데이터 여부 포함: { new_releases: ["US_M2", "US_CPI"] }
```

## 출력 스키마

```sql
CREATE TABLE macro_indicators (
  time            TIMESTAMPTZ NOT NULL,
  indicator       TEXT NOT NULL,
  country         TEXT NOT NULL,        -- 'US' or 'KR'
  value           DOUBLE PRECISION,
  unit            TEXT,
  mom_change_pct  DOUBLE PRECISION,
  yoy_change_pct  DOUBLE PRECISION,
  source          TEXT,
  series_id       TEXT,
  is_new_release  BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('macro_indicators', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| FRED API 키 누락 | 미국 지표 전체 스킵, Orchestrator에 알림 |
| BOK API 키 누락 | 한국 지표 전체 스킵, Orchestrator에 알림 |
| 데이터 값 "." (FRED 미발표) | 해당 월 스킵, 이전 값 유지 |
| YoY 계산 불가 (12개월 전 데이터 없음) | yoy_change_pct null로 적재 |

## 제약 사항

- 거시지표는 대부분 월별 발표. 실시간성이 아닌 정확성이 중요하다.
- FRED, BOK 모두 무료 API이나 일일 호출 한도 존재. 불필요한 중복 호출 방지.
- 데이터 해석(금리 인상의 의미 등)은 하지 않는다. 분석 Layer에 위임.
