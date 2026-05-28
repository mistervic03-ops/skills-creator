# API Contracts

## 공통
- Base URL: `http://localhost:8000`
- Content-Type: `application/json`
- 에러 응답: `{ "error": "메시지" }`

---

## POST /chat

인터뷰 대화 1턴을 처리한다.

### Request
```json
{
  "session_id": "string",
  "message": "string",
  "files": []          // Phase 3에서 구현. 현재는 빈 배열.
}
```

### Response
```json
{
  "message": "string",
  "ready_to_generate": false
}
```

### 동작
1. session_id로 히스토리 조회 (없으면 새 세션 생성)
2. 사용자 메시지를 히스토리에 추가
3. interviewer.md를 system으로, 히스토리 전체를 messages로 Haiku 호출
4. 응답에서 `<READY_TO_GENERATE>` 태그 감지
5. 태그 제거한 메시지와 플래그 반환
6. 어시스턴트 메시지를 히스토리에 추가

---

## POST /generate

인터뷰 히스토리를 기반으로 SKILL.md를 생성한다.

### Request
```json
{
  "session_id": "string"
}
```

### Response
```json
{
  "skill_md": "string",
  "summary": {
    "trigger": "string",
    "inputs": "string",
    "output_format": "string",
    "audience": "string",
    "environment": "string"
  }
}
```

### 동작
1. session_id로 히스토리 조회
2. generator.md를 system으로, 히스토리 + 생성 지시를 messages로 Sonnet 호출
3. 검증 레이어 실행:
   - description 필드가 영어인가
   - 필수 섹션(## 언제 사용하나요, ## 시작 전 준비할 것, ## 출력 형식)이 존재하는가
4. 검증 실패 시 재생성 (최대 2회 재시도, 사용자 노출 없음)
5. summary 추출 후 반환

---

## POST /sessions

새 세션을 명시적으로 생성한다. (선택적, /chat에서 자동 생성도 가능)

### Response
```json
{
  "session_id": "string"
}
```
