# Prompt Design

## 파일 위치
- `backend/prompts/interviewer.md` — 인터뷰어 시스템 프롬프트
- `backend/prompts/generator.md` — 생성기 시스템 프롬프트

## 수정 방법
프롬프트는 코드와 분리된 파일로 관리한다.
코드 배포 없이 파일만 수정해서 프롬프트를 튜닝할 수 있다.
수정 후 이 문서의 "변경 이력"에 날짜와 변경 요약을 추가할 것.

## 인터뷰어 프롬프트 설계 원칙
- 한 번에 질문 하나만
- 최대 7턴 (초과 시 파악된 내용으로 생성 진행)
- 수집 목표 5가지: 트리거 / 입력 / 출력 / 독자 / 구동 환경
- 구동 환경은 1~4가 파악된 후 반드시 한 번 질문하고, 어떤 답변이든 확인 완료로 간주
- 기술 용어(SKILL.md, 워크플로우 등) 사용자 노출 금지
- 완료 신호: `<READY_TO_GENERATE>` 태그

## 생성기 프롬프트 설계 원칙
- description 필드는 반드시 영어로 생성
- instruction body는 한국어로 생성
- 섹션 헤더는 영어로, 본문 내용은 한국어로 작성
- 본문 전체는 AI가 직접 수행하는 지시문으로 작성.
  사용자 안내문, 면책 문구는 스킬 본문에 포함하지 않음 (UI에서 별도 제공)
- 구동 환경이 있으면 "## Environment Setup" 섹션 포함
- 연동 없는 fallback 지시 포함
- 모호한 표현("적절하게" 등) 금지

## SKILL.md 출력 스펙
```yaml
---
name: lowercase-hyphens-only
description: English sentence describing when to activate.
version: "1.0.0"
tags: [한국어, 태그]
workflow_type: transformation | review | research | operational | decision_support
---

## When to Use
## Inputs
## Workflow
## Output Format
## Success Criteria
## Validation Checklist
## Notes  ← 관련 내용이 있을 때만
## Environment Setup  ← 구동 환경 있을 때만
```

## 검증 레이어
생성 후 백엔드에서 자동 체크:
1. `description` 필드가 영어인가 (ASCII 문자 비율 > 90%)
2. 필수 섹션 존재 여부: `## When to Use`, `## Inputs`, `## Workflow`, `## Output Format`, `## Success Criteria`, `## Validation Checklist`
실패 시 재생성 요청 (최대 2회, 사용자 노출 없음)

## 변경 이력
| 날짜 | 버전 | 변경 내용 |
|---|---|---|
| 2026-05-29 | 인터뷰어 v0.6 | 구동 환경 1회 필수 확인, 질문 최소화 원칙 강화 |
| 2026-05-29 | v0.8 | workflow_type 추가, Inputs/Workflow 구조와 검증 기준 갱신 |
| 2026-05-28 | v0.4 | 섹션 헤더 영어화, AI 지시문/사용자 안내문 역할 분리 명시 |
| 2026-05-28 | v0.2 | 구동 환경 항목 추가, 연동 스킬 지원 |
