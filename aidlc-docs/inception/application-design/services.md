# 서비스 정의 및 오케스트레이션 (Services)

> 사용자 결정(Q1=B, 단순형)에 따라 별도 서비스 계층은 두지 않는다.
> 따라서 "서비스"는 별도 클래스가 아니라 **라우터 핸들러가 수행하는 오케스트레이션 흐름 + 재사용 헬퍼**로 표현된다.
> 아래는 핵심 유스케이스의 오케스트레이션 흐름을 정의한다.

---

## S1. 주문 생성 흐름 (고객)

```
CustomerApp.createOrder
  → [POST /api/orders]  (get_current_table 의존성으로 테이블 인증)
  → OrderComponent.create_order
      → ensure_active_session(table_id)   # 세션 없으면 첫 주문으로 세션 시작
      → generate_order_number
      → Order + OrderItem 저장 (menu_name/unit_price 스냅샷)
      → calc_table_total (참고용)
      → RealtimeComponent.publish(order_created)
  → 응답: 주문 번호
  → CustomerApp: 장바구니 비우기 → 성공 화면(약 5초) → 메뉴로 리다이렉트
```

## S2. 실시간 모니터링 흐름 (관리자)

```
AdminApp(Dashboard) 최초 로드
  → [GET /api/admin/tables] dashboard_summary  # 초기 그리드 데이터
  → [GET /api/admin/stream] RealtimeComponent.stream  # SSE 구독 시작
      ← 이후 order_created / order_status_changed / order_deleted / table_session_closed 이벤트 수신(2초 이내)
  → 이벤트 수신 시 해당 테이블 카드 갱신 + 신규 주문 시각 강조
```

## S3. 주문 상태 변경 / 삭제 흐름 (관리자)

```
AdminApp
  → [PATCH /api/admin/orders/{id}] update_order_status → publish(order_status_changed)
  → [DELETE /api/admin/orders/{id}] delete_order → calc_table_total → publish(order_deleted)
```

## S4. 테이블 세션 종료(이용 완료) 흐름 (관리자)

```
AdminApp (확인 팝업 후)
  → [POST /api/admin/tables/{id}/close] close_table_session
      → move_session_to_history(session_id)   # 현재 주문을 OrderHistory로 이동
      → 테이블 current_session_id = null, 현재 주문/총액 리셋
      → RealtimeComponent.publish(table_session_closed)
  → 대시보드 해당 테이블 카드 리셋
```

## S5. 과거 내역 조회 흐름 (관리자)

```
AdminApp (과거 내역 버튼)
  → [GET /api/admin/tables/{id}/history?date_from&date_to] list_table_history
  → 시간 역순 목록 표시 (완료 시각 포함) → 닫기 시 대시보드 복귀
```

## S6. 메뉴 관리 흐름 (관리자)

```
AdminApp(MenuManageView)
  → [GET/POST/PUT/DELETE /api/admin/menus ...] MenuComponent CRUD (+ validate_menu)
  → 노출 순서 조정: reorder_menus
```

## S7. 인증 흐름

```
관리자: AdminApp → [POST /api/admin/login] admin_login (bcrypt 검증, 시도 제한) → JWT(16h) 저장
테이블: CustomerApp(TableSetup 1회) → [POST /api/table/login] table_login → 테이블 토큰 로컬 저장 → 자동 로그인
보호 엔드포인트: get_current_admin / get_current_table 의존성으로 검증
```

---

## 오케스트레이션 원칙 (MVP, 단순형)

- 라우터 핸들러가 DB 접근 + 이벤트 발행을 직접 수행하되, 반복 로직은 헬퍼 함수로 분리해 중복 제거
- SSE는 인메모리 pub/sub — publish는 동기적으로 구독자 큐에 push, 스트림 핸들러가 큐를 소비
- 트랜잭션 경계: 세션 종료(이력 이동 + 리셋)는 하나의 DB 트랜잭션으로 처리(부분 실패 방지)
