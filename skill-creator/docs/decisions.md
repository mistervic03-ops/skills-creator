# Architecture Decision Records

경량 ADR. 주요 설계 결정과 이유를 기록한다.
새로운 결정이 생기면 이 파일에 추가할 것.

---

## ADR-001: 실행 환경을 툴 밖으로 분리

**결정**: 스킬 직접 실행 기능을 만들지 않는다.
**이유**: wrapper 리스크. 사용자가 이미 ChatGPT/Claude.ai에 익숙하므로,
생성된 SKILL.md를 거기에 붙여넣는 것으로 충분하다.
**결과**: export(다운로드/복사)가 최종 출력.

---

## ADR-002: 인터뷰 완료 감지를 태그 방식으로

**결정**: `<READY_TO_GENERATE>` 문자열 포함 여부로 전환 감지.
**이유**: JSON 파싱은 LLM 응답 형식이 조금만 달라져도 깨짐.
태그 감지는 단순하고 안정적.
**결과**: backend에서 `"<READY_TO_GENERATE>" in response` 체크.

---

## ADR-003: 인터뷰 히스토리를 그대로 생성기에 전달

**결정**: 인터뷰 후 별도 파싱/추출 없이 전체 히스토리를 생성기에 넘긴다.
**이유**: 비개발 업무 스킬은 정보가 단순해서 Two-pass의 이점보다
복잡도 증가가 더 크다.
**결과**: POST /generate는 session_id만 받아 히스토리를 그대로 사용.

---

## ADR-004: 프롬프트를 코드와 분리

**결정**: 시스템 프롬프트를 backend/prompts/*.md 파일로 관리.
**이유**: 프롬프트 튜닝 시 코드 배포 없이 파일만 수정 가능.
**결과**: services/interviewer.py, generator.py가 파일을 읽어 사용.

---

## ADR-005: description은 영어, 본문은 한국어

**결정**: SKILL.md의 description 필드는 영어, instruction body는 한국어.
**이유**: description은 에이전트 트리거 매칭에 쓰이므로 영어가 정확도가 높음.
본문은 비개발자 가독성과 한국어 출력 품질을 위해 한국어.
**결과**: 생성기 프롬프트에 규칙 명시 + 검증 레이어에서 강제.

---

## ADR-006: 구동 환경을 인터뷰 항목에 추가

**결정**: 인터뷰 5번째 항목으로 구동 환경(Slack/Outlook 등 연동) 추가.
**이유**: 영업팀이 Slack+Outlook 연동 ChatGPT를 실사용 중임이 확인됨.
에이전틱 워크플로우를 스킬에 포함해야 할 수 있음.
**결과**: 구동 환경 있으면 스킬에 "## 사용 전 확인사항" 섹션 자동 포함.
실제 연동 작동 여부는 사용자 환경에 따름 (Skill Creator 책임 밖).

---

## ADR-007: Python 코드는 Black으로 포맷

**결정**: 모든 Python 코드는 Black 기본 규칙(line length 88, target py39)으로 포맷한다.
**이유**: 포맷 논쟁과 수동 정렬 비용을 줄이고, 백엔드/테스트 코드 스타일을 일관되게 유지한다.
**결과**: `pyproject.toml`에 Black 설정을 두고, Python 변경 후 `python3 -m black --check .`를 통과시킨다.
