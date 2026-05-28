# Architecture

## 개요
비개발자가 Q&A 인터뷰를 통해 SKILL.md를 생성하는 웹 툴.
인터뷰 → 카드 검증 → export의 단방향 플로우로 동작한다.

## 스택
| 영역 | 선택 | 비고 |
|---|---|---|
| 백엔드 | FastAPI (Python) | |
| 프론트엔드 | React + Vite (TypeScript) | |
| 인터뷰 모델 | claude-haiku-4-5 | 속도/비용 우선 |
| 생성 모델 | claude-sonnet-4-6 | 품질 우선 |
| 세션 관리 | 메모리 내 dict | Phase 4에서 DB로 이전 예정 |

## 전체 플로우
```
[인터뷰 루프]
사용자 입력
    → POST /chat (system: interviewer.md + 전체 히스토리)
    → 응답에서 <READY_TO_GENERATE> 태그 감지
    → { message, ready_to_generate: bool } 반환
    → ready_to_generate: false → 대화 계속
    → ready_to_generate: true → 자동으로 /generate 호출

[생성]
POST /generate (system: generator.md + 인터뷰 히스토리 전체)
    → 검증 레이어 (description 영어 여부 + 필수 섹션 존재)
    → 실패 시 재생성 (사용자 노출 없음, 최대 2회)
    → SKILL.md 텍스트 반환

[카드 검증]
핵심 항목 요약 카드 표시
    → 확인: export 화면으로
    → 수정: 인터뷰 루프 복귀 (히스토리 누적)

[Export]
SKILL.md 미리보기 + 다운로드(.md) + 복사
```

## 디렉토리 구조
```
skill-creator/
├── AGENTS.md
├── docs/
├── backend/
│   ├── main.py              FastAPI 앱 진입점
│   ├── api/routes.py        엔드포인트 정의
│   ├── services/
│   │   ├── interviewer.py   인터뷰 로직 + 세션 관리
│   │   └── generator.py     SKILL.md 생성 + 검증
│   ├── prompts/
│   │   ├── interviewer.md   인터뷰어 시스템 프롬프트
│   │   └── generator.md     생성기 시스템 프롬프트
│   └── tests/
└── frontend/
    └── src/
        ├── components/
        ├── pages/
        └── hooks/
```

## 의존성 방향
- frontend → backend API (HTTP)
- backend/api → backend/services
- backend/services → backend/prompts (파일 읽기)
- backend/services → Anthropic API (외부)
- 역방향 의존성 금지
