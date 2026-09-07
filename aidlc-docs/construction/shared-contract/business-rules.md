# Business Rules (계약 관련 공통 비즈니스 규칙 — 확정)

계약에 직접 영향을 주는 공통 규칙만 정의한다. 유닛 내부 상세 로직/엣지케이스는 각 유닛 Functional Design에서 확장한다.

---

## BR-1. 인증 / 세션
- **BR-1.1** 관리자 JWT 유효기간 16시간(57600s). 만료·무효 시 API `401`. (Q6=A)
- **BR-1.2** 비밀번호(관리자·테이블)는 bcrypt 해시로만 저장. 평문 저장/로그 금지.
- **BR-1.3** 관리자 로그인 시도 제한: 연속 실패 N회(기본 5회) 시 계정 일시 잠금(`locked_until`). 잠금 중 로그인은 `429`. 성공 시 `failed_attempts` 리셋.
- **BR-1.4** 테이블 토큰은 store_code+table_number+table_password 검증으로 발급. (만료 정책은 MVP에서 장기/무만료에 가깝게 — 자동 로그인 UX 위해; 무효 시 `401` → 초기 설정 화면.)

## BR-2. 주문 번호 (Q2=A)
- **BR-2.1** 형식 `T{table_number}-{seq:04d}` (예: `T3-0007`).
- **BR-2.2** seq는 **테이블별** 순번. 세션 경계와 무관하게 테이블 기준 단조 증가(단순화). 생성은 서버 `generate_order_number`가 담당.

## BR-3. 주문 상태 (Q3=A)
- **BR-3.1** 상태 값: `pending`(대기중) → `preparing`(준비중) → `completed`(완료). 프론트에서 한글 라벨 매핑.
- **BR-3.2** 허용 전이: `pending→preparing`, `preparing→completed`, 그리고 역방향 정정 허용(`preparing→pending`, `completed→preparing`). 동일 상태로의 전이는 무시(멱등). 그 외 전이는 `400`.
  - (MVP 단순화: 관리자 직권이므로 인접 단계 양방향 허용. 완전 자유 전이가 필요하면 유닛 FD에서 조정.)

## BR-4. 총액 계산
- **BR-4.1** 주문 total_amount = Σ(OrderItem.unit_price × quantity). unit_price는 주문 시점 스냅샷.
- **BR-4.2** 테이블 현재 총액(table_total) = 현재 active 세션에 속한 모든 Order.total_amount 합. 삭제/생성 시 재계산.

## BR-5. 세션 라이프사이클
- **BR-5.1** 테이블 첫 주문 시 active TableSession 자동 생성(`ensure_active_session`). 한 테이블에 active 세션 최대 1개.
- **BR-5.2** 현재 세션 주문 조회(고객/관리자)는 active 세션 주문만 반환. 이용 완료된 주문 제외.
- **BR-5.3** 이용 완료(`close`): 트랜잭션으로 (a) active 세션의 Order/OrderItem을 OrderHistory로 이동(items_json 스냅샷), (b) 원본 Order/OrderItem 삭제, (c) TableSession.status=`closed`, closed_at 기록. 이후 현재 총액/주문수 0. (Q4=A)
- **BR-5.4** 이용 완료 멱등성: active 세션이 없으면(이미 종료) `400`을 반환하되, 프론트는 이를 "이미 정리됨"으로 처리 가능. (엄격/멱등 여부는 유닛 FD에서 최종 확정 — 기본은 `400`.)
- **BR-5.5** 세션 종료 후 동일 테이블의 다음 첫 주문은 **새 세션**을 시작.

## BR-6. 메뉴 검증 (Q7=A: 금액 정수 원)
- **BR-6.1** 필수: name, price, category_id. price는 정수 ≥ 0(가격 범위 검증). name 비어있으면 `400`.
- **BR-6.2** 메뉴 삭제 시에도 기존 OrderItem/OrderHistory의 스냅샷(menu_name/unit_price)은 보존(이력 무결성). menu_id 참조는 null 가능.
- **BR-6.3** display_order로 노출 순서 제어(reorder). 미지정 시 말미 배치.

## BR-7. 주문 생성 검증
- **BR-7.1** items 비어있으면 `400`. 각 항목 quantity ≥ 1. 존재하지 않거나 타 매장 menu_id면 `400`.
- **BR-7.2** 주문 생성 성공 시 `order_created` 이벤트 발행(SSE). 상태변경→`order_status_changed`, 삭제→`order_deleted`, 세션종료→`table_session_closed`.

## BR-8. 금액/통화 (Q7=A)
- 모든 금액은 정수(원 단위, KRW). 소수점 없음. 프론트 표시는 천단위 콤마 포맷팅.

## BR-9. 에러 (Q5=A)
- 에러 본문 `{ "detail": "<메시지>" }`. 상태코드로 유형 구분(400/401/404/409/429).

---

## 규칙 ↔ 스토리 추적
| 규칙 | 관련 스토리 |
|------|-------------|
| BR-1 | US-A1, US-C1 |
| BR-2, BR-7 | US-C4 |
| BR-3 | US-A3, US-C5 |
| BR-4 | US-A4, US-A2 |
| BR-5 | US-A5, US-C5 |
| BR-6 | US-A7, US-C2 |
| BR-8, BR-9 | 전역 |
