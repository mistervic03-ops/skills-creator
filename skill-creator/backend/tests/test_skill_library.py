import json
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


def test_save_skill(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.post(
        "/skills",
        json={
            "skill_md": "# Meeting Summary\n\nUse this skill for notes.",
            "author": "Jane",
        },
    )

    assert response.status_code == 200
    metadata = response.json()
    assert metadata["id"]
    assert metadata["title"] == "Meeting Summary"
    assert metadata["author"] == "Jane"
    assert metadata["tags"] == []
    assert (tmp_path / metadata["id"] / "skill.md").read_text(
        encoding="utf-8"
    ) == "# Meeting Summary\n\nUse this skill for notes."
    assert (
        json.loads(
            (tmp_path / metadata["id"] / "metadata.json").read_text(encoding="utf-8")
        )
        == metadata
    )


def test_list_skills_newest_first(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)
    first = client.post("/skills", json={"skill_md": "# First"}).json()
    second = client.post("/skills", json={"skill_md": "# Second"}).json()
    _set_created_at(tmp_path, first["id"], "2026-01-01T00:00:00+00:00")
    _set_created_at(tmp_path, second["id"], "2026-01-02T00:00:00+00:00")

    response = client.get("/skills")

    assert response.status_code == 200
    assert [metadata["id"] for metadata in response.json()] == [
        second["id"],
        first["id"],
    ]


def test_get_skill(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)
    saved = client.post(
        "/skills",
        json={"skill_md": "# Onboarding\n\nChecklist", "author": "Jane"},
    ).json()

    response = client.get(f"/skills/{saved['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["metadata"] == saved
    assert body["skill_md"] == "# Onboarding\n\nChecklist"


def test_delete_skill(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)
    saved = client.post("/skills", json={"skill_md": "# To Delete"}).json()

    response = client.delete(f"/skills/{saved['id']}")

    assert response.status_code == 200
    assert response.json() == {"deleted": True}
    assert not (tmp_path / saved["id"]).exists()
    assert client.get(f"/skills/{saved['id']}").status_code == 404


def test_search(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)
    matching = client.post(
        "/skills",
        json={
            "skill_md": """---
name: Revenue Review
description: Analyze sales risk
tags: [sales, finance]
workflow_type: review
---

# Ignored
""",
            "author": "Jane",
        },
    ).json()
    client.post("/skills", json={"skill_md": "# Meeting Summary", "author": "Kim"})

    response = client.get("/skills", params={"q": "finance"})

    assert response.status_code == 200
    assert [metadata["id"] for metadata in response.json()] == [matching["id"]]


def test_path_traversal_rejection(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.get("/skills/%2E%2E")

    assert response.status_code == 400
    assert response.json() == {"error": "Invalid skill id"}


def test_missing_metadata_does_not_crash_list(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    skill_dir = tmp_path / "missingmetadata"
    skill_dir.mkdir()
    (skill_dir / "skill.md").write_text("# Missing Metadata", encoding="utf-8")
    client = TestClient(app)

    response = client.get("/skills")

    assert response.status_code == 200
    assert response.json()[0]["id"] == "missingmetadata"
    assert response.json()[0]["title"] == "Untitled Skill"


def test_frontmatter_metadata_parsing(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.post(
        "/skills",
        json={
            "skill_md": """---
name: Pipeline Brief
description: Summarize pipeline changes
tags:
  - sales
  - weekly
workflow_type: transformation
---

# Ignored H1
""",
        },
    )

    assert response.status_code == 200
    metadata = response.json()
    assert metadata["title"] == "Pipeline Brief"
    assert metadata["description"] == "Summarize pipeline changes"
    assert metadata["workflow_type"] == "transformation"
    assert metadata["tags"] == ["sales", "weekly"]
    assert metadata["author"] == "작성자 미상"


def test_h1_fallback_title_parsing(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILL_LIBRARY_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.post("/skills", json={"skill_md": "# Fallback Title\n\nBody"})

    assert response.status_code == 200
    assert response.json()["title"] == "Fallback Title"


def _set_created_at(storage_dir: Path, skill_id: str, created_at: str) -> None:
    metadata_path = storage_dir / skill_id / "metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["created_at"] = created_at
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
