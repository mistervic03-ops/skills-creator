# Prompt Design

## 파일 위치
- `backend/prompts/interviewer.md` — 인터뷰어 시스템 프롬프트
- `backend/prompts/generator.md` — 생성기 시스템 프롬프트

## 수정 방법
프롬프트는 코드와 분리된 파일로 관리한다.
코드 배포 없이 파일만 수정해서 프롬프트를 튜닝할 수 있다.
백엔드 서비스가 시작될 때 프롬프트 파일을 읽으므로, 프롬프트 수정 후에는 백엔드를 재시작해서 변경 내용을 반영한다.
수정 후 이 문서의 "변경 이력"에 날짜와 변경 요약을 추가할 것.

## 인터뷰어 프롬프트 설계 원칙
- 한 번에 질문 하나만
- 최대 7턴 (초과 시 파악된 내용으로 생성 진행)
- 수집 목표 6가지: 트리거 / 입력 / 핵심 판단 기준 / 출력 / 독자 / 외부 자료 접근 방식
- 사용자가 업무를 설명한 뒤 핵심 판단 기준이 없으면 독자, 출력 형식, 공유 방식, 사용 도구,
  트리거, 빈도보다 먼저 확인
- 외부 자료 접근 방식은 Salesforce, Outlook, Slack, Confluence, Google Drive,
  Notion, CRM, 이메일, 파일 저장소, 외부 시스템 같은 자료 출처가 등장한 경우에만 한 번 확인
- 직접 제공/파일 제공은 Document Workflow, AI가 직접 접근 가능한 환경은 Agent-Capable Mode로 간주
- 기술 용어(SKILL.md, 워크플로우 등) 사용자 노출 금지
- 완료 신호: `<READY_TO_GENERATE>` 태그

## 생성기 프롬프트 설계 원칙
- description 필드는 반드시 영어로 생성
- instruction body는 한국어로 생성
- 섹션 헤더는 영어로, 본문 내용은 한국어로 작성
- workflow_type은 업무 목적을 먼저 보고, 그 다음 핵심 사고 과정 기준으로 분류
- `보고서`, `정리`, `문서`, `메일` 같은 출력 형태만 보고 transformation으로 분류하지 않음
- 본문 전체는 AI가 직접 수행하는 지시문으로 작성.
  사용자 안내문, 면책 문구는 스킬 본문에 포함하지 않음 (UI에서 별도 제공)
- 기간, 역할, 조직 구조, 데이터 필드, 세부 카테고리는 인터뷰에서 언급된 경우에만 포함
- Capability와 관계없이 인터뷰에서 언급되지 않은 정보 유형은 추가하지 않음
- Capability 미확인 상태에서는 외부 시스템 검색, 웹사이트 분석, 크롤링 행동 생성 금지
- Capability 미확인 상태에서는 제공된 Salesforce 자료/이메일 기록/경쟁사 자료 검토 형태만 허용
- AI가 외부 도구에 직접 접근 가능한 환경으로 확인된 경우에만 "## Environment Setup" 섹션 포함
- Environment Setup에는 환경 전제 조건만 작성하고 사용자 안내문은 포함하지 않음
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
## Environment Setup  ← AI의 외부 도구 직접 접근이 확인됐을 때만
```

## 검증 레이어
생성 후 백엔드에서 자동 체크:
1. `description` 필드가 영어인가 (ASCII 문자 비율 > 90%)
2. 필수 섹션 존재 여부: `## When to Use`, `## Inputs`, `## Workflow`, `## Output Format`, `## Success Criteria`, `## Validation Checklist`
실패 시 재생성 요청 (최대 2회, 사용자 노출 없음)

## 변경 이력
| 날짜 | 버전 | 변경 내용 |
|---|---|---|
| 2026-05-29 | 생성기 v1.0 | workflow_type 판단 순서, Environment Setup, 정보 유형 추론 금지 기준 보정 |
| 2026-05-29 | 생성기 v1.0 | workflow_type을 최종 산출물이 아니라 핵심 사고 과정으로 분류하도록 기준 강화 |
| 2026-05-29 | 인터뷰어 v0.9 / 생성기 v1.0 | Judgement Extractor 우선순위 강화, Capability 미확인 Agent 행동 금지 |
| 2026-05-29 | 인터뷰어 v0.8 / 생성기 v0.9 | 핵심 판단 기준 우선 질문, 생성기 추론 금지 범주 강화 |
| 2026-05-29 | 인터뷰어 v0.7 / 생성기 v0.8 | 외부 시스템 등장 시에만 자료 제공 방식과 Agent Capability를 1회 확인 |
| 2026-05-29 | 인터뷰어 v0.6 | 구동 환경 1회 필수 확인, 질문 최소화 원칙 강화 |
| 2026-05-29 | v0.8 | workflow_type 추가, Inputs/Workflow 구조와 검증 기준 갱신 |
| 2026-05-28 | v0.4 | 섹션 헤더 영어화, AI 지시문/사용자 안내문 역할 분리 명시 |
| 2026-05-28 | v0.2 | 구동 환경 항목 추가, 연동 스킬 지원 |
