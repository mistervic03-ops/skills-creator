import os
from pathlib import Path
from uuid import uuid4

from anthropic import Anthropic


INTERVIEW_MODEL = "claude-haiku-4-5-20251001"
READY_TAG = "<READY_TO_GENERATE>"


class InterviewerService:
    def __init__(self, client=None):
        self.sessions: dict[str, list[dict[str, str]]] = {}
        self._client = client
        self._system_prompt = self._load_system_prompt()

    def create_session(self) -> str:
        session_id = str(uuid4())
        self.sessions[session_id] = []
        return session_id

    def chat(self, session_id: str, message: str) -> dict[str, object]:
        history = self.sessions.setdefault(session_id, [])
        history.append({"role": "user", "content": message})

        response = self._anthropic_client().messages.create(
            model=INTERVIEW_MODEL,
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

    def get_history(self, session_id: str) -> list[dict[str, str]]:
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


interviewer_service = InterviewerService()
