import os
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.interviewer import InterviewerService, interviewer_service


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


@pytest.fixture(autouse=True)
def reset_global_interviewer_service():
    interviewer_service.clear()
    interviewer_service._client = None
    yield
    interviewer_service.clear()
    interviewer_service._client = None


def test_create_session_endpoint():
    client = TestClient(app)

    response = client.post("/sessions")

    assert response.status_code == 200
    session_id = response.json()["session_id"]
    assert session_id
    assert interviewer_service.get_history(session_id) == []


def test_chat_endpoint_uses_session_history():
    interviewer_service._client = FakeAnthropicClient(["첫 질문입니다."])
    client = TestClient(app)
    session_id = client.post("/sessions").json()["session_id"]

    response = client.post(
        "/chat",
        json={
            "session_id": session_id,
            "message": "회의록 요약을 자주 해요.",
            "files": [],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "첫 질문입니다.",
        "ready_to_generate": False,
    }
    assert interviewer_service.get_history(session_id) == [
        {"role": "user", "content": "회의록 요약을 자주 해요."},
        {"role": "assistant", "content": "첫 질문입니다."},
    ]


def test_history_accumulates_by_session():
    fake_client = FakeAnthropicClient(["첫 질문입니다.", "다음 질문입니다."])
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    service.chat(session_id, "업무를 정리하고 싶어요.")
    service.chat(session_id, "회의록을 요약해요.")

    assert service.get_history(session_id) == [
        {"role": "user", "content": "업무를 정리하고 싶어요."},
        {"role": "assistant", "content": "첫 질문입니다."},
        {"role": "user", "content": "회의록을 요약해요."},
        {"role": "assistant", "content": "다음 질문입니다."},
    ]
    assert len(fake_client.messages.calls) == 2


def test_ready_tag_returns_true_and_strips_message():
    fake_client = FakeAnthropicClient(
        ["충분히 파악됐어요. 만들어볼게요! <READY_TO_GENERATE>"]
    )
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    response = service.chat(session_id, "충분합니다.")

    assert response == {
        "message": "충분히 파악됐어요. 만들어볼게요!",
        "ready_to_generate": True,
    }
    assert service.get_history(session_id)[-1] == {
        "role": "assistant",
        "content": "충분히 파악됐어요. 만들어볼게요!",
    }


def test_missing_ready_tag_returns_false():
    fake_client = FakeAnthropicClient(["어떤 결과물 형식이 필요하세요?"])
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    response = service.chat(session_id, "반복 업무가 있어요.")

    assert response == {
        "message": "어떤 결과물 형식이 필요하세요?",
        "ready_to_generate": False,
    }
