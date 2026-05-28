import os
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.generator import GENERATION_MODEL, GeneratorService, generator_service
from services.interviewer import interviewer_service


class FakeMessages:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        reply = self.replies.pop(0)
        return SimpleNamespace(content=[SimpleNamespace(text=reply)])


class FakeAnthropicClient:
    def __init__(self, replies):
        self.messages = FakeMessages(replies)


def skill_md(description="Use this skill when summarizing team meeting notes."):
    return f"""---
name: meeting-summary
description: {description}
version: "1.0.0"
tags: [팀, 회의록]
---

# 회의록 요약

## 언제 사용하나요
회의가 끝난 뒤 결정사항과 할 일을 정리할 때 사용합니다.

## 시작 전 준비할 것
회의 녹취록과 안건 목록을 준비합니다.

## 작성 방법
결정사항과 할 일을 분리해서 작성합니다.

## 출력 형식
핵심 결정사항과 담당자별 할 일을 짧은 목록으로 출력합니다.

## 주의사항
인터뷰에서 언급되지 않은 내용을 추가하지 않습니다.

## 사용 전 확인사항
Slack에 공유할 수 있는 환경에서 사용할 때 가장 좋습니다.
"""


@pytest.fixture(autouse=True)
def reset_global_services():
    interviewer_service.clear()
    generator_service._client = None
    yield
    interviewer_service.clear()
    generator_service._client = None


def test_generate_endpoint_returns_skill_md_and_summary_when_validation_passes():
    session_id = interviewer_service.create_session()
    interviewer_service.sessions[session_id] = [
        {"role": "user", "content": "회의록을 요약하고 싶어요."},
        {"role": "assistant", "content": "결과물은 누가 보나요?"},
    ]
    fake_client = FakeAnthropicClient([skill_md()])
    generator_service._client = fake_client
    client = TestClient(app)

    response = client.post("/generate", json={"session_id": session_id})

    assert response.status_code == 200
    body = response.json()
    assert body["skill_md"] == skill_md()
    assert body["summary"] == {
        "trigger": "회의가 끝난 뒤 결정사항과 할 일을 정리할 때 사용합니다.",
        "inputs": "회의 녹취록과 안건 목록을 준비합니다.",
        "output_format": "핵심 결정사항과 담당자별 할 일을 짧은 목록으로 출력합니다.",
        "audience": "팀",
        "environment": "Slack에 공유할 수 있는 환경에서 사용할 때 가장 좋습니다.",
    }
    assert fake_client.messages.calls[0]["model"] == GENERATION_MODEL
    assert fake_client.messages.calls[0]["messages"][:-1] == interviewer_service.get_history(
        session_id
    )
    assert len(interviewer_service.get_history(session_id)) == 2


def test_korean_description_triggers_regeneration():
    fake_client = FakeAnthropicClient(
        [
            skill_md("회의록을 요약할 때 사용합니다."),
            skill_md(),
        ]
    )
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == skill_md()
    assert len(fake_client.messages.calls) == 2
    assert "description 값에 한글" in fake_client.messages.calls[1]["messages"][-1][
        "content"
    ]


def test_missing_required_section_triggers_regeneration():
    missing_output_format = skill_md().replace(
        "## 출력 형식\n핵심 결정사항과 담당자별 할 일을 짧은 목록으로 출력합니다.\n\n",
        "",
    )
    fake_client = FakeAnthropicClient([missing_output_format, skill_md()])
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == skill_md()
    assert len(fake_client.messages.calls) == 2
    assert "## 출력 형식 섹션이 없습니다." in fake_client.messages.calls[1][
        "messages"
    ][-1]["content"]


def test_returns_last_result_after_two_retries_are_exhausted():
    first = skill_md("첫 번째 실패입니다.")
    second = skill_md("두 번째 실패입니다.")
    third = skill_md("세 번째 실패입니다.")
    fake_client = FakeAnthropicClient([first, second, third])
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == third
    assert len(fake_client.messages.calls) == 3
