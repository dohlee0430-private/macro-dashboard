# Real Estate Agent

## 역할

한국 주요 지역의 아파트 매매·전세 가격지수, 실거래가 동향을 수집한다.

## 모델

- Claude Haiku

## 트리거

- 일 1회 07:00 KST
- 한국부동산원 주간 통계 발표일 (목요일) 추가 실행

## 데이터 소스

| 데이터 | 소스 | 비용 |
|--------|------|------|
| 주간 아파트가격동향 | 한국부동산원 API (공공데이터포털) | 무료 |
| 아파트 실거래가 | 국토교통부 실거래가 API | 무료 |
| KB 아파트 시세 | KB부동산 (크롤링 필요) | 무료 |

### 커버 지역

서울, 강남구, 서초구, 송파구, 마포구, 용산구, 경기, 인천, 부산, 대구, 대전, 광주, 세종

## 수집 프로세스

```
1. 공공데이터포털 API 호출
   GET http://apis.data.go.kr/1613000/...
   ?serviceKey={DATA_GO_KR_API_KEY}
   &region_code={code}
   &deal_ymd={YYYYMM}

2. 국토교통부 실거래가 API
   GET http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev
   ?LAWD_CD={지역코드}&DEAL_YMD={년월}

3. 데이터 정규화
   {
     region: "서울",
     region_code: "11",
     sub_region: "강남구",
     avg_price_per_m2: 3200,        -- 만원/m²
     price_index: 105.2,             -- 기준=100
     week_change_pct: 0.12,
     yoy_change_pct: 4.1,
     transaction_count: 1842,        -- 월간 거래량
     data_type: "매매",              -- 매매 or 전세
     collected_at: "2026-03-11T07:00:00Z"
   }

4. 파생 지표 계산
   - 전세가율: 전세 평균가 / 매매 평균가 * 100
   - 주간 변동률 추세 (4주 이동평균)
   - 거래량 전월 대비 증감

5. TimescaleDB 적재
   - real_estate 테이블에 INSERT

6. Redis 캐시 갱신
   - key: realestate:latest:{region}:{data_type}
   - TTL: 86400초

7. Orchestrator에 완료 이벤트 발행
```

## 출력 스키마

```sql
CREATE TABLE real_estate (
  time                TIMESTAMPTZ NOT NULL,
  region              TEXT NOT NULL,
  region_code         TEXT,
  sub_region          TEXT,
  avg_price_per_m2    DOUBLE PRECISION,     -- 만원/m²
  price_index         DOUBLE PRECISION,
  week_change_pct     DOUBLE PRECISION,
  yoy_change_pct      DOUBLE PRECISION,
  transaction_count   INTEGER,
  jeonse_ratio        DOUBLE PRECISION,     -- 전세가율(%)
  data_type           TEXT,                 -- '매매' or '전세'
  source              TEXT
);

SELECT create_hypertable('real_estate', 'time');
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| 공공데이터포털 API 키 누락 | 스킵, 정적 스냅샷 데이터 유지 |
| 특정 지역 데이터 누락 | 해당 지역만 null, 나머지 정상 적재 |
| 실거래가 지연 (통상 1~2개월 지연) | 최신 가용 데이터 기준으로 적재, 지연 플래그 표시 |
| KB 크롤링 차단 | KB 데이터 스킵, 공공데이터만 사용 |

## 제약 사항

- 부동산 데이터는 본질적으로 지연이 크다. 실거래가는 1~2개월, 가격지수는 주간 단위.
- 가격 해석(거품 여부, 전망 등)은 하지 않는다.
- KB부동산 크롤링은 이용약관 검토 필요. 위반 시 공공데이터 소스만 사용.
