import os
import re
from pathlib import Path
from typing import Optional

from anthropic import Anthropic


GENERATION_MODEL = "claude-sonnet-4-6-20250514"
MAX_RETRIES = 2
GENERATION_INSTRUCTION = (
    "지금까지의 인터뷰 히스토리를 바탕으로 SKILL.md 파일 내용을 생성하세요. "
    "SKILL.md 본문만 출력하고, 설명이나 코드 블록은 포함하지 마세요."
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

        for _ in range(MAX_RETRIES + 1):
            skill_md = self._call_model(history, failures)
            failures = self._validation_failures(skill_md)
            if not failures:
                break

        return {
            "skill_md": skill_md,
            "summary": self._extract_summary(skill_md),
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
            "## 언제 사용하나요",
            "## 시작 전 준비할 것",
            "## 출력 형식",
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
        return re.search(rf"^{re.escape(section)}\s*$", skill_md, re.MULTILINE) is not None

    @classmethod
    def _extract_summary(cls, skill_md: str) -> dict[str, str]:
        return {
            "trigger": cls._first_sentence(cls._section_body(skill_md, "언제 사용하나요")),
            "inputs": cls._first_sentence(cls._section_body(skill_md, "시작 전 준비할 것")),
            "output_format": cls._first_sentence(cls._section_body(skill_md, "출력 형식")),
            "audience": cls._first_tag(skill_md),
            "environment": cls._first_sentence(cls._section_body(skill_md, "사용 전 확인사항")),
        }

    @staticmethod
    def _section_body(skill_md: str, heading: str) -> str:
        pattern = rf"^## {re.escape(heading)}\s*$\n(?P<body>.*?)(?=^## |\Z)"
        match = re.search(pattern, skill_md, re.MULTILINE | re.DOTALL)
        if not match:
            return ""
        return match.group("body").strip()

    @staticmethod
    def _first_sentence(text: str) -> str:
        normalized = " ".join(
            line.strip().lstrip("-*0123456789. ").strip()
            for line in text.splitlines()
            if line.strip()
        )
        if not normalized:
            return ""

        match = re.search(r".+?[.!?。！？](?:\s|$)", normalized)
        if match:
            return match.group(0).strip()
        return normalized

    @classmethod
    def _first_tag(cls, skill_md: str) -> str:
        tags = cls._frontmatter_value(skill_md, "tags")
        if not tags:
            return ""

        if tags.startswith("[") and tags.endswith("]"):
            tags = tags[1:-1]

        first_tag = tags.split(",", 1)[0].strip()
        return first_tag.strip("\"'")


generator_service = GeneratorService()
