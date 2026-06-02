from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_AUTHOR = "작성자 미상"
DEFAULT_STORAGE_DIR = "./data/skills"
DEFAULT_TITLE = "Untitled Skill"
FRONTMATTER_RE = re.compile(r"\A---\s*\n(?P<body>.*?)\n---", re.DOTALL)
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_-]+$")
SEARCH_FIELDS = ("title", "description", "workflow_type", "author")


class SkillNotFoundError(Exception):
    pass


class InvalidSkillIdError(Exception):
    pass


class SkillLibraryService:
    def save_skill(self, skill_md: str, author: str | None = None) -> dict[str, Any]:
        skill_id = self._generate_id()
        skill_dir = self._skill_dir(skill_id)
        skill_dir.mkdir(parents=True, exist_ok=False)

        now = self._now()
        parsed = self._parse_metadata(skill_md)
        metadata = {
            "id": skill_id,
            "title": parsed["title"],
            "description": parsed["description"],
            "workflow_type": parsed["workflow_type"],
            "tags": parsed["tags"],
            "author": author or DEFAULT_AUTHOR,
            "created_at": now,
            "updated_at": now,
        }

        self._atomic_write(skill_dir / "skill.md", skill_md)
        self._atomic_write(
            skill_dir / "metadata.json",
            json.dumps(metadata, ensure_ascii=False, indent=2),
        )
        return metadata

    def list_skills(self, q: str | None = None) -> list[dict[str, Any]]:
        metadata_list = []
        storage_dir = self._storage_dir()
        if not storage_dir.exists():
            return []

        for child in storage_dir.iterdir():
            if not child.is_dir() or not SAFE_ID_RE.fullmatch(child.name):
                continue
            metadata = self._read_metadata(child)
            if q and not self._matches_query(metadata, q):
                continue
            metadata_list.append(metadata)

        return sorted(
            metadata_list,
            key=lambda metadata: str(metadata.get("created_at", "")),
            reverse=True,
        )

    def get_skill(self, skill_id: str) -> dict[str, Any]:
        skill_dir = self._skill_dir(skill_id)
        skill_path = skill_dir / "skill.md"
        if not skill_path.exists():
            raise SkillNotFoundError(skill_id)

        return {
            "metadata": self._read_metadata(skill_dir),
            "skill_md": skill_path.read_text(encoding="utf-8"),
        }

    def delete_skill(self, skill_id: str) -> None:
        skill_dir = self._skill_dir(skill_id)
        if not skill_dir.exists():
            raise SkillNotFoundError(skill_id)
        shutil.rmtree(skill_dir)

    def _storage_dir(self) -> Path:
        return Path(os.environ.get("SKILL_LIBRARY_DIR", DEFAULT_STORAGE_DIR))

    def _skill_dir(self, skill_id: str) -> Path:
        if not SAFE_ID_RE.fullmatch(skill_id):
            raise InvalidSkillIdError(skill_id)

        storage_dir = self._storage_dir().resolve()
        skill_dir = (storage_dir / skill_id).resolve()
        if storage_dir != skill_dir and storage_dir not in skill_dir.parents:
            raise InvalidSkillIdError(skill_id)
        return skill_dir

    def _read_metadata(self, skill_dir: Path) -> dict[str, Any]:
        fallback = self._fallback_metadata(skill_dir)
        metadata_path = skill_dir / "metadata.json"

        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return fallback

        if not isinstance(metadata, dict):
            return fallback

        result = {**fallback, **metadata}
        result["id"] = skill_dir.name
        result["tags"] = self._normalize_tags(result.get("tags"))
        return result

    def _fallback_metadata(self, skill_dir: Path) -> dict[str, Any]:
        try:
            updated_at = self._datetime_from_timestamp(skill_dir.stat().st_mtime)
        except OSError:
            updated_at = ""

        return {
            "id": skill_dir.name,
            "title": DEFAULT_TITLE,
            "description": "",
            "workflow_type": "",
            "tags": [],
            "author": DEFAULT_AUTHOR,
            "created_at": updated_at,
            "updated_at": updated_at,
        }

    @classmethod
    def _parse_metadata(cls, skill_md: str) -> dict[str, Any]:
        frontmatter = cls._parse_frontmatter(skill_md)
        title = str(frontmatter.get("name") or "").strip()
        if not title:
            title = cls._parse_h1(skill_md)
        if not title:
            title = DEFAULT_TITLE

        return {
            "title": title,
            "description": str(frontmatter.get("description") or "").strip(),
            "workflow_type": str(frontmatter.get("workflow_type") or "").strip(),
            "tags": cls._normalize_tags(frontmatter.get("tags")),
        }

    @staticmethod
    def _parse_h1(skill_md: str) -> str:
        match = H1_RE.search(skill_md)
        if not match:
            return ""
        return match.group(1).strip()

    @classmethod
    def _parse_frontmatter(cls, skill_md: str) -> dict[str, Any]:
        match = FRONTMATTER_RE.search(skill_md)
        if not match:
            return {}

        values: dict[str, Any] = {}
        current_list_key = ""
        for raw_line in match.group("body").splitlines():
            line = raw_line.strip()
            if not line:
                continue

            list_item = re.match(r"^-\s+(.+)$", line)
            if list_item and current_list_key:
                values.setdefault(current_list_key, []).append(
                    cls._clean_scalar(list_item.group(1))
                )
                continue

            current_list_key = ""
            key_value = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$", line)
            if not key_value:
                continue

            key, value = key_value.groups()
            if key not in {"name", "description", "tags", "workflow_type"}:
                continue

            if key == "tags":
                values[key] = cls._parse_tags(value)
                if value == "":
                    current_list_key = key
            else:
                values[key] = cls._clean_scalar(value)

        return values

    @classmethod
    def _parse_tags(cls, value: str) -> list[str]:
        value = value.strip()
        if not value:
            return []
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if not inner:
                return []
            return [
                cls._clean_scalar(part)
                for part in inner.split(",")
                if cls._clean_scalar(part)
            ]
        return [cls._clean_scalar(value)]

    @staticmethod
    def _clean_scalar(value: str) -> str:
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            return value[1:-1]
        return value

    @staticmethod
    def _normalize_tags(value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @staticmethod
    def _matches_query(metadata: dict[str, Any], query: str) -> bool:
        needle = query.casefold().strip()
        if not needle:
            return True

        haystack = [str(metadata.get(field, "")) for field in SEARCH_FIELDS] + [
            str(tag) for tag in metadata.get("tags", [])
        ]
        return any(needle in value.casefold() for value in haystack)

    @staticmethod
    def _generate_id() -> str:
        return uuid.uuid4().hex

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _datetime_from_timestamp(timestamp: float) -> str:
        return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()

    @staticmethod
    def _atomic_write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=path.parent,
            delete=False,
        ) as temp_file:
            temp_file.write(content)
            temp_path = Path(temp_file.name)
        os.replace(temp_path, path)


skill_library_service = SkillLibraryService()
