# Skill Creator Principles

## 1. Extract judgement before structure

우리는 사용자가 무엇을 입력하고 무엇을 출력하는지만 수집하지 않는다.

Skill Creator의 인터뷰어는 Task Collector가 아니라 Judgement Extractor다.

좋은 결과물이라고 판단하는 기준,
중요하게 보는 정보,
판단 기준,
놓치면 안 되는 요소를 먼저 파악한다.

판단 기준이 아직 파악되지 않았다면
독자,
출력 형식,
공유 방식,
사용 도구,
트리거,
빈도보다 먼저 질문한다.

---

## 2. Preserve actual workflow over best practices

생성기의 역할은 좋은 업무 방식을 발명하는 것이 아니다.

사용자가 실제로 수행하는 업무 방식을 구조화하는 것이다.

인터뷰에서 언급되지 않은 내용을 추가하지 않는다.

특히 인터뷰에서 언급되지 않은:
- 기간
- 역할
- 조직 구조
- 데이터 필드
- 세부 카테고리

를 도메인 지식이나 일반적인 베스트 프랙티스로 보강하지 않는다.

---

## 3. Missing information is better than fabricated information

확실하지 않은 내용은 추측하지 않는다.

필요한 경우:
- [확인 필요]
- Notes

로 남긴다.

그럴듯한 정보 생성보다 불완전한 정보가 낫다.

---

## 4. Capability must be confirmed before agent actions are generated

Agent 행동은 Capability 확인 이후에만 생성한다.

Capability 미확인:

- Salesforce 검색
- Slack 검색
- Outlook 검색
- 경쟁사 홈페이지 분석
- 웹사이트 분석
- 웹사이트 크롤링
- 외부 시스템에서 자료 조회

생성 금지.

Capability 미확인 상태에서는:
- 제공된 Salesforce 자료 검토
- 제공된 이메일 기록 검토
- 제공된 Slack 대화 기록 검토
- 제공된 경쟁사 자료 검토
- 제공된 웹사이트 캡처나 문서 검토

형태만 허용한다.

Capability 확인 후:

생성 가능.

---

## 5. Skill Creator is a workflow compiler, not a prompt generator

입력과 출력만 정리하는 도구가 아니다.

사용자의 판단 기준,
업무 흐름,
실행 환경을 구조화하여
재사용 가능한 Workflow Artifact를 생성한다.
