# Skill Creator — Task Breakdown

> 버전: v0.1
> 기준 문서: skill-creator-design.md v0.2

---

## Phase 0: 프로젝트 골격
완료 기준: `uvicorn main:app` 과 `npm run dev` 가 둘 다 정상 기동

- [x] Task 0-1: 디렉토리 생성 + AGENTS.md 작성
- [x] Task 0-2: docs/ 초기 문서 4개 작성 (architecture, api-contracts, prompt-design, decisions)
- [x] Task 0-3: backend 골격 (FastAPI, 빈 라우터, 프롬프트 파일 복사)
- [x] Task 0-4: frontend 골격 (React + Vite, 빈 페이지 구조)

## Phase 1: 인터뷰 루프
완료 기준: 브라우저에서 인터뷰를 끝까지 진행하면 READY_TO_GENERATE 감지

- [x] Task 1-1: POST /chat 엔드포인트 (히스토리 누적 + Haiku 호출 + 태그 감지)
- [x] Task 1-2: 세션 관리 (메모리 내 dict) — Task 1-1에 포함
- [x] Task 1-3: 인터뷰 UI (채팅 입력창 + 메시지 목록 + 자동 전환)
- [x] Task 1-4: 인터뷰어 프롬프트 통합 테스트 (시나리오 3개)

## Phase 2: 생성 + 카드 검증
완료 기준: 인터뷰 → 생성 → 카드 확인 → export 전체 플로우 동작

- [x] Task 2-1: POST /generate 엔드포인트 (Sonnet 호출 + SKILL.md 반환)
- [x] Task 2-2: 검증 레이어 (description 영어 체크 + 필수 섹션 체크 + 재생성) — Task 2-1에 포함
- [x] Task 2-3: 카드 검증 UI (요약 카드 + 확인/수정 버튼)
- [x] Task 2-4: 수정 분기 (인터뷰 루프 복귀 + 히스토리 누적) — Task 2-3에 포함
- [x] Task 2-5: Export UI (미리보기 + 다운로드 + 복사) — Task 2-3에 포함

## Phase 3: 파일 첨부
완료 기준: docx/xlsx/PDF 첨부 후 인터뷰어가 내용을 참고해서 질문

- [x] Task 3-1: 백엔드 파일 처리 (PDF/이미지 base64, docx/xlsx 텍스트 추출)
- [x] Task 3-2: 파일 업로드 UI (상시 노출 버튼 + 인디케이터)
- [x] Task 3-3: 지원 형식 외 파일 안내 메시지 — Task 3-2에 포함

## Phase 4: 라이브러리
완료 기준: 생성한 스킬이 저장되고 다른 사람이 목록에서 찾아 복사 가능

- [ ] Task 4-1: DB 설계 + 연결 (SQLite, PostgreSQL 이전 가능 구조)
- [ ] Task 4-2: POST /skills 엔드포인트
- [ ] Task 4-3: GET /skills 엔드포인트 (목록 + 검색)
- [ ] Task 4-4: 라이브러리 UI (카드 목록 + 검색/필터)
- [ ] Task 4-5: 스킬 상세 + 재export
