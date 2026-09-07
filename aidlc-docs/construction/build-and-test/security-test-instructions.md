# Security Test Instructions

> Security Baseline 확장은 Requirements Analysis에서 **비활성(Disabled)** 으로 결정됨(로컬 MVP/데모). 아래는 기본 위생 점검 및 통합 검증에서 확인된 인증/권한 항목 요약이며, 강제(blocking) 규칙은 아니다.

## 1. 인증/인가 (통합 검증에서 확인 — PASS)
- 관리자 JWT / 테이블 토큰 발급 및 `Authorization: Bearer` 검증 동작
- 잘못된 자격 → 401, 토큰 없이 보호 엔드포인트 → 401
- 로그인 시도 제한(`MAX_LOGIN_ATTEMPTS`, `LOCK_MINUTES`) 및 429 경로 존재(`test_auth.py`)
- 비밀번호 bcrypt 해시(passlib) 저장

## 2. 의존성 취약점 스캔

### Frontend (`npm audit`)
```bash
cd frontend && npm audit
```
- **최근 결과**: 4건 (moderate 3, high 1)
  - `esbuild` <=0.24.2 (moderate) — **dev 서버 전용**, 프로덕션 번들 영향 없음. `vite`가 전이 의존
  - `react-router` / `react-router-dom` 6.x (moderate) — open redirect / SSR hydration 관련. 현재 SSR 미사용
- **조치**: `npm audit fix --force`는 vite 8 / react-router 7로의 **breaking change**를 유발하므로 MVP에서 보류. 로컬 데모 범위에서 수용. 프로덕션 승격 시 메이저 업그레이드 + 회귀 검증 권장

### Backend
- `python-jose`, `passlib` 관련 DeprecationWarning(동작 무관). 프로덕션 승격 시 `bcrypt` 직접 사용/`datetime` timezone-aware 전환 권장

## 3. 설정 위생 (권장 사항)
- `SECRET_KEY`는 반드시 운영용 긴 랜덤 값으로 교체(`.env.example`에 경고 명시됨)
- CORS 설정 검토(프로덕션 시 허용 오리진 제한)
- SQLite 파일 접근 권한(로컬 데모 한정)

## 판정
로컬 MVP/데모 범위에서 **수용 가능**. 인증/인가 경로는 통합 검증 통과. 의존성 취약점은 dev-only 또는 미사용 기능에 국한되며 프로덕션 승격 시 재평가 대상.
