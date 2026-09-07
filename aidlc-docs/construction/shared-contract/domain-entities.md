# Domain Entities (공통 도메인/데이터 모델 — 확정)

**확정 결정 반영**: 정수 auto-increment PK(Q1=A), 금액=정수 원 단위(Q7=A), 세션 종료 시 별도 `OrderHistory` 테이블 이동(Q4=A), 주문상태 영문 코드(Q3=A).
**대상**: backend 유닛이 SQLAlchemy 모델로 구현, frontend 유닛은 API 응답 형태로 소비.

> 타입 표기: `int`(정수), `str`(문자열), `datetime`(ISO 8601 UTC 문자열로 직렬화), `bool`. 금액은 모두 `int`(원 단위).

---

## 1. Store (매장)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_code | str | 매장 식별자(로그인 입력값), unique, not null |
| name | str | 매장명 |
| created_at | datetime | 생성 시각 |

## 2. AdminUser (관리자 계정)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_id | int | FK → Store.id |
| username | str | 로그인 사용자명, (store_id, username) unique |
| password_hash | str | bcrypt 해시 (평문 저장 금지) |
| failed_attempts | int | 로그인 실패 누적(시도 제한용), default 0 |
| locked_until | datetime? | 잠금 해제 시각(없으면 null) |
| created_at | datetime | |

## 3. Table (테이블)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_id | int | FK → Store.id |
| table_number | str | 테이블 번호(표시용, 예 "3"), (store_id, table_number) unique |
| password_hash | str | 테이블 비밀번호 bcrypt 해시 |
| created_at | datetime | |

> 파생값(현재 총액, 현재 주문 수)은 저장하지 않고 조회 시 계산(calc_table_total).

## 4. TableSession (테이블 세션)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| table_id | int | FK → Table.id |
| store_id | int | FK → Store.id (조회 편의) |
| status | str | `active` / `closed` |
| started_at | datetime | 첫 주문 시 시작 |
| closed_at | datetime? | 이용 완료 시각(active면 null) |

> 규칙: 한 테이블에 `active` 세션은 최대 1개. 첫 주문 시 생성, 이용 완료 시 `closed`.

## 5. Category (카테고리)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_id | int | FK → Store.id |
| name | str | 카테고리명 |
| display_order | int | 노출 순서(오름차순) |

## 6. Menu (메뉴)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_id | int | FK → Store.id |
| category_id | int | FK → Category.id |
| name | str | 메뉴명, not null |
| price | int | 가격(원, ≥ 0), not null |
| description | str? | 설명 |
| image_url | str? | 이미지 URL |
| display_order | int | 노출 순서 |
| is_deleted | bool | soft-delete 여부(default false; 이력 스냅샷 보존 위해 물리삭제 대신 사용 가능) |

## 7. Order (주문 — 현재 세션 활성 주문)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_id | int | FK → Store.id |
| table_id | int | FK → Table.id |
| session_id | int | FK → TableSession.id |
| order_number | str | 사람이 읽는 주문번호 `T{table}-{seq:4}` (Q2=A) |
| status | str | `pending` / `preparing` / `completed` (Q3=A) |
| total_amount | int | 주문 총액(원) = Σ(item.unit_price × quantity) |
| created_at | datetime | 주문 시각 |

## 8. OrderItem (주문 항목 — 스냅샷)
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| order_id | int | FK → Order.id |
| menu_id | int? | FK → Menu.id (참조용, 메뉴 삭제 시 null 가능) |
| menu_name | str | **스냅샷** — 주문 시점 메뉴명 |
| unit_price | int | **스냅샷** — 주문 시점 단가(원) |
| quantity | int | 수량(≥ 1) |

## 9. OrderHistory (과거 주문 이력 — 세션 종료 시 이동)
세션 종료(이용 완료) 시 해당 세션의 Order/OrderItem을 이력으로 이동(Q4=A).
| 필드 | 타입 | 제약/설명 |
|------|------|-----------|
| id | int | PK |
| store_id | int | FK → Store.id |
| table_id | int | FK → Table.id |
| session_id | int | FK → TableSession.id (그룹화 키) |
| order_number | str | 이동 전 주문번호 스냅샷 |
| status | str | 이동 시점 상태 |
| total_amount | int | 주문 총액 |
| ordered_at | datetime | 원 주문 시각 |
| items_json | str | 주문 항목 스냅샷(JSON 직렬화: [{menu_name, unit_price, quantity}]) |
| session_closed_at | datetime | 매장 이용 완료 시각 |

> 이동 방식: 트랜잭션으로 Order/OrderItem → OrderHistory 복제 후 원본 Order/OrderItem 삭제, TableSession.status=`closed`, closed_at 기록.

---

## 관계 요약 (Text)
```
Store 1─* AdminUser
Store 1─* Table 1─* TableSession 1─* Order 1─* OrderItem
Store 1─* Category 1─* Menu
Order *─1 Menu (OrderItem.menu_id, nullable)
TableSession 1─* OrderHistory   (세션 종료 시 Order에서 이동)
```

## 검증 규칙(요약, 상세는 business-rules.md)
- Menu.price ≥ 0, OrderItem.quantity ≥ 1
- 한 Table당 active TableSession ≤ 1
- OrderItem은 항상 menu_name/unit_price 스냅샷 보유(메뉴 변경/삭제와 독립)
