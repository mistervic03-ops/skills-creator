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

## 유지보수 규칙
- 작고 읽기 쉬우며 조합 가능한 변경을 선호할 것
- 명시적으로 요청받지 않은 넓은 범위의 리팩터링은 하지 말 것
- 기능 구현 중에는 변경을 직접 뒷받침하는 작은 로컬 정리만 허용할 것
- 더 큰 구조적 문제가 보이면 즉시 고치지 말고 후속 권장사항으로 요약할 것
- 새 동작을 추가할 때 컴포넌트와 함수의 책임을 명확히 유지하고 중복을 피할 것

## 정리 규칙
- 기능 구현이나 테스트 작성 후 더 이상 필요 없는 `.gitkeep`, 임시 파일, 캐시, 빌드 산출물은 같은 작업에서 정리할 것
- 테스트는 현재 동작을 검증하지 않는 중복/구식 테스트만 삭제하고, 삭제 근거가 애매하면 유지할 것
- 로컬 산출물(`dist/`, `.pytest_cache/` 등)은 커밋하지 말고 발견 즉시 제거할 것

## 서버 확인 규칙
- 서버 관련 파일이나 실행 상태를 만진 뒤에는 프론트엔드와 백엔드가 둘 다 올라갔는지 확인할 것
- 프론트엔드는 `http://localhost:5173`, 백엔드는 `http://localhost:8000/health` 응답으로 확인할 것
- 한쪽만 떠 있는 상태로 작업을 마치지 말고, 실패 시 어느 쪽이 실패했는지와 로그 위치를 사용자에게 알릴 것
---
