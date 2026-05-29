from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from anthropic import Anthropic


INTERVIEW_MODEL_SELECTIONS = {"auto", "haiku", "sonnet"}
INTERVIEW_MODELS = {
    "haiku": "claude-haiku-4-5-20251001",
    "sonnet": "claude-sonnet-4-20250514",
}
INTERVIEW_MODEL = INTERVIEW_MODELS["haiku"]
READY_TAG = "<READY_TO_GENERATE>"
START_INTERVIEW_MESSAGE = "인터뷰를 시작해 주세요."
COMPLEX_WORKFLOW_TYPES = {"review", "research", "decision_support"}
WORKFLOW_TYPE_KEYWORDS = {
    "decision_support": (
        "의사결정",
        "결정",
        "비교",
        "옵션",
        "리스크",
        "투자",
        "전략",
        "판단",
        "우선순위",
    ),
    "research": (
        "조사",
        "리서치",
        "경쟁사",
        "시장",
        "고객 분석",
        "자료 수집",
        "트렌드",
    ),
    "review": (
        "검토",
        "리뷰",
        "피드백",
        "첨삭",
        "검수",
        "제안서 리뷰",
        "코드 리뷰",
    ),
    "transformation": (
        "요약",
        "정리",
        "변환",
        "보고서",
        "회의록",
        "티켓",
        "메일 작성",
    ),
    "operational": (
        "운영",
        "주간 보고",
        "온보딩",
        "인수인계",
        "관리",
        "반복",
    ),
}


class InterviewerService:
    def __init__(self, client=None):
        self.sessions: dict[str, list[dict[str, object]]] = {}
        self._client = client
        self._system_prompt = self._load_system_prompt()

    def create_session(self) -> str:
        session_id = str(uuid4())
        self.sessions[session_id] = []
        return session_id

    def chat(
        self,
        session_id: str,
        message: str | list[dict[str, object]],
        model_selection: str = "auto",
    ) -> dict[str, object]:
        message = self._normalize_message(message)
        history = self.sessions.setdefault(session_id, [])
        history.append({"role": "user", "content": message})
        model = resolve_interview_model(model_selection, history)

        response = self._anthropic_client().messages.create(
            model=model,
            max_tokens=1024,
            system=self._system_prompt,
            messages=history,
        )
        assistant_message = self._extract_text(response)
        clean_message, ready_to_generate = self._strip_ready_tag(assistant_message)

        history.append({"role": "assistant", "content": clean_message})

        return {
            "message": clean_message,
            "ready_to_generate": ready_to_generate,
        }

    def get_history(self, session_id: str) -> list[dict[str, object]]:
        return self.sessions.setdefault(session_id, [])

    def clear(self) -> None:
        self.sessions.clear()

    def _anthropic_client(self):
        if self._client is not None:
            return self._client

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        self._client = Anthropic(api_key=api_key)
        return self._client

    @staticmethod
    def _load_system_prompt() -> str:
        prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "interviewer.md"
        return prompt_path.read_text(encoding="utf-8")

    @staticmethod
    def _extract_text(response) -> str:
        parts: list[str] = []
        for block in getattr(response, "content", []):
            if isinstance(block, dict):
                text = block.get("text")
            else:
                text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "".join(parts)

    @staticmethod
    def _strip_ready_tag(message: str) -> tuple[str, bool]:
        ready_to_generate = READY_TAG in message
        return message.replace(READY_TAG, "").strip(), ready_to_generate

    @staticmethod
    def _normalize_message(
        message: str | list[dict[str, object]],
    ) -> str | list[dict[str, object]]:
        if isinstance(message, str) and not message.strip():
            return START_INTERVIEW_MESSAGE
        return message


def resolve_interview_model(
    model_selection: str,
    history: list[dict[str, object]],
) -> str:
    normalized_selection = model_selection.strip().lower()
    if normalized_selection in {"haiku", "sonnet"}:
        return INTERVIEW_MODELS[normalized_selection]

    workflow_type = infer_workflow_type(history)
    if workflow_type in COMPLEX_WORKFLOW_TYPES:
        return INTERVIEW_MODELS["sonnet"]

    return INTERVIEW_MODELS["haiku"]


def infer_workflow_type(history: list[dict[str, object]]) -> str:
    text = " ".join(_message_text(message.get("content", "")) for message in history)
    for workflow_type, keywords in WORKFLOW_TYPE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return workflow_type

    return "operational"


def _message_text(content: object) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and isinstance(block.get("text"), str):
                text_parts.append(block["text"])
        return " ".join(text_parts)

    return ""


interviewer_service = InterviewerService()
