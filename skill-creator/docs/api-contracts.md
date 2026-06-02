# API Contracts

## 공통
- Local backend direct Base URL: `http://localhost:8000`
- Docker frontend proxy Base URL: `/api`
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
  "model_preference": "auto | haiku | sonnet",
  "files": []          // Phase 3에서 구현. 현재는 빈 배열.
}
```

`model_preference` 기본값은 `auto`이며 인터뷰어 모델에만 적용된다. `/generate` 모델은 변경하지 않는다.

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
    "environment": "string",
    "workflow_type": "transformation | review | research | operational | decision_support"
  }
}
```

### 동작
1. session_id로 히스토리 조회
2. generator.md를 system으로, 히스토리 + 생성 지시를 messages로 Sonnet 호출
3. 검증 레이어 실행:
   - description 필드가 영어인가
   - 필수 섹션(## When to Use, ## Inputs, ## Workflow, ## Output Format, ## Success Criteria, ## Validation Checklist)이 존재하는가
4. 검증 실패 시 재생성 (최대 2회 재시도, 사용자 노출 없음)
5. 응답을 `---SUMMARY---` 기준으로 분리해서 SKILL.md와 summary JSON을 반환
   - summary JSON 파싱 실패 시 workflow_type은 `operational`, 나머지 summary 항목은 빈 문자열로 반환
   - workflow_type이 없거나 허용된 5개 값 밖이면 `operational`로 반환

---

## POST /sessions

새 세션을 명시적으로 생성한다. (선택적, /chat에서 자동 생성도 가능)

### Response
```json
{
  "session_id": "string"
}
```

---

## POST /skills

생성된 SKILL.md 내용을 로컬 파일시스템에 저장한다.

### Request
```json
{
  "skill_md": "string",
  "author": "string optional"
}
```

### Response
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "workflow_type": "string",
  "tags": [],
  "author": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

### 동작
- 서버에서 안전한 고유 id를 생성한다.
- `SKILL_LIBRARY_DIR` 아래 `<id>/skill.md`와 `<id>/metadata.json`을 저장한다.
- frontmatter의 `name`, `description`, `tags`, `workflow_type`을 metadata에 반영한다.
- title은 frontmatter `name`, 첫 번째 H1, `Untitled Skill` 순서로 결정한다.
- author가 없으면 `작성자 미상`을 사용한다.

---

## GET /skills

저장된 스킬 metadata 목록을 최신순으로 반환한다.

### Query
- `q` optional: `title`, `description`, `workflow_type`, `tags`, `author` 검색

### Response
```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "workflow_type": "string",
    "tags": [],
    "author": "string",
    "created_at": "string",
    "updated_at": "string"
  }
]
```

metadata 파일이 없거나 손상된 항목은 fallback metadata로 반환한다.

---

## GET /skills/{id}

저장된 스킬 metadata와 markdown 본문을 반환한다.

### Response
```json
{
  "metadata": {
    "id": "string",
    "title": "string",
    "description": "string",
    "workflow_type": "string",
    "tags": [],
    "author": "string",
    "created_at": "string",
    "updated_at": "string"
  },
  "skill_md": "string"
}
```

---

## DELETE /skills/{id}

저장된 스킬 디렉터리를 삭제한다.

### Response
```json
{
  "deleted": true
}
```
