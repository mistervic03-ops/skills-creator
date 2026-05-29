import json
import os
import re
from pathlib import Path
from typing import Optional

from anthropic import Anthropic


GENERATION_MODEL = "claude-sonnet-4-20250514"
MAX_RETRIES = 2
SUMMARY_SEPARATOR = "---SUMMARY---"
SUMMARY_KEYS = (
    "trigger",
    "inputs",
    "output_format",
    "audience",
    "environment",
    "workflow_type",
)
VALID_WORKFLOW_TYPES = {
    "transformation",
    "review",
    "research",
    "operational",
    "decision_support",
}
DEFAULT_WORKFLOW_TYPE = "operational"
GENERATION_INSTRUCTION = (
    "지금까지의 인터뷰 히스토리를 바탕으로 SKILL.md 파일 내용을 생성하세요. "
    "SKILL.md 전체 내용을 먼저 작성한 뒤, 아래 구분자와 함께 summary를 JSON으로 출력하세요.\n\n"
    "---SUMMARY---\n"
    "{\n"
    '  "trigger": "When to Use 섹션 핵심 1문장",\n'
    '  "inputs": "Inputs 섹션 핵심 1문장",\n'
    '  "output_format": "Output Format 섹션 핵심 1문장",\n'
    '  "audience": "이 스킬의 실제 결과물을 받는 사람 (인터뷰에서 파악된 실제 독자)",\n'
    '  "environment": "Environment Setup 섹션 핵심 1문장, 없으면 빈 문자열",\n'
    '  "workflow_type": "transformation | review | research | operational | decision_support 중 하나"\n'
    "}"
)
KOREAN_RE = re.compile(r"[가-힣]")
FRONTMATTER_RE = re.compile(r"\A---\s*\n(?P<body>.*?)\n---", re.DOTALL)


class GeneratorService:
    def __init__(self, client=None):
        self._client = client
        self._system_prompt = self._load_system_prompt()

    def generate(self, history: list[dict[str, str]]) -> dict[str, object]:
        failures: list[str] = []
        skill_md = ""
        summary = self._empty_summary()

        for _ in range(MAX_RETRIES + 1):
            response_text = self._call_model(history, failures)
            skill_md, summary = self._split_generation_response(response_text)
            failures = self._validation_failures(skill_md)
            if not failures:
                break

        return {
            "skill_md": skill_md,
            "summary": summary,
        }

    def _call_model(
        self,
        history: list[dict[str, str]],
        previous_failures: list[str],
    ) -> str:
        instruction = GENERATION_INSTRUCTION
        if previous_failures:
            instruction += "\n\n이전 생성 결과의 검증 실패 사유:\n"
            instruction += "\n".join(f"- {failure}" for failure in previous_failures)
            instruction += "\n위 문제를 수정해서 다시 생성하세요."

        messages = [*history, {"role": "user", "content": instruction}]
        response = self._anthropic_client().messages.create(
            model=GENERATION_MODEL,
            max_tokens=4096,
            system=self._system_prompt,
            messages=messages,
        )
        return self._extract_text(response)

    def _validation_failures(self, skill_md: str) -> list[str]:
        failures: list[str] = []
        description = self._frontmatter_value(skill_md, "description")

        if description is None:
            failures.append("frontmatter description 필드가 없습니다.")
        elif KOREAN_RE.search(description):
            failures.append("frontmatter description 값에 한글이 포함되어 있습니다.")

        for section in (
            "## When to Use",
            "## Inputs",
            "## Workflow",
            "## Output Format",
            "## Success Criteria",
            "## Validation Checklist",
        ):
            if not self._has_section(skill_md, section):
                failures.append(f"{section} 섹션이 없습니다.")

        return failures

    @staticmethod
    def _load_system_prompt() -> str:
        prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "generator.md"
        return prompt_path.read_text(encoding="utf-8")

    def _anthropic_client(self):
        if self._client is not None:
            return self._client

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        self._client = Anthropic(api_key=api_key)
        return self._client

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
    def _frontmatter_body(skill_md: str) -> str:
        match = FRONTMATTER_RE.search(skill_md)
        if not match:
            return ""
        return match.group("body")

    @classmethod
    def _frontmatter_value(cls, skill_md: str, key: str) -> Optional[str]:
        frontmatter = cls._frontmatter_body(skill_md)
        match = re.search(rf"^{re.escape(key)}:\s*(.+?)\s*$", frontmatter, re.MULTILINE)
        if not match:
            return None
        return match.group(1).strip().strip("\"'")

    @staticmethod
    def _has_section(skill_md: str, section: str) -> bool:
        return (
            re.search(rf"^{re.escape(section)}\s*$", skill_md, re.MULTILINE) is not None
        )

    @classmethod
    def _split_generation_response(
        cls, response_text: str
    ) -> tuple[str, dict[str, str]]:
        if SUMMARY_SEPARATOR not in response_text:
            return response_text.strip(), cls._empty_summary()

        skill_md, summary_text = response_text.split(SUMMARY_SEPARATOR, 1)
        return skill_md.strip(), cls._parse_summary(summary_text)

    @classmethod
    def _parse_summary(cls, summary_text: str) -> dict[str, str]:
        try:
            parsed = json.loads(summary_text.strip())
        except json.JSONDecodeError:
            return cls._empty_summary()

        if not isinstance(parsed, dict):
            return cls._empty_summary()

        summary: dict[str, str] = {}
        for key in SUMMARY_KEYS:
            value = parsed.get(key, "")
            summary[key] = value if isinstance(value, str) else ""
        if summary["workflow_type"] not in VALID_WORKFLOW_TYPES:
            summary["workflow_type"] = DEFAULT_WORKFLOW_TYPE
        return summary

    @staticmethod
    def _empty_summary() -> dict[str, str]:
        return {
            key: DEFAULT_WORKFLOW_TYPE if key == "workflow_type" else ""
            for key in SUMMARY_KEYS
        }


generator_service = GeneratorService()
