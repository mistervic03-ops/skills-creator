---
# Skill Creator — Agent Map

## 이 프로젝트가 하는 일
비개발자가 Q&A 인터뷰를 통해 SKILL.md를 생성할 수 있는 웹 툴.
- 백엔드: FastAPI (Python)
- 프론트엔드: React + Vite (TypeScript)

## 읽어야 할 문서
| 목적 | 파일 |
|---|---|
| 전체 구조 파악 | docs/architecture.md |
| API 수정/추가 | docs/api-contracts.md |
| 프롬프트 수정 | docs/prompt-design.md |
| 설계 결정 이유 | docs/decisions.md |
| 태스크 현황 | docs/tasks.md |

## 코드 위치
| 영역 | 경로 |
|---|---|
| 백엔드 진입점 | backend/main.py |
| API 라우터 | backend/api/routes.py |
| 인터뷰 서비스 | backend/services/interviewer.py |
| 생성 서비스 | backend/services/generator.py |
| 프롬프트 파일 | backend/prompts/ |
| 프론트엔드 | frontend/src/ |

## 문서 유지 규칙 (반드시 준수)
- 코드 변경 시 관련 docs/ 파일을 같은 작업에서 업데이트할 것
- 더 이상 유효하지 않은 문서는 삭제할 것 (stale 방치 금지)
- 새로운 설계 결정이 생기면 docs/decisions.md에 추가할 것
- 버그 수정 후 재발 방지 테스트를 backend/tests/ 또는 frontend/에 추가할 것
- docs/tasks.md의 완료된 태스크는 [x]로 체크할 것
---
