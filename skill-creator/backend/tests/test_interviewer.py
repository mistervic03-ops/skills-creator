import base64
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.interviewer import (
    INTERVIEW_MODELS,
    START_INTERVIEW_MESSAGE,
    InterviewerService,
    infer_workflow_type,
    interviewer_service,
    resolve_interview_model,
)


PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "interviewer.md"


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
    fake_client = FakeAnthropicClient(["첫 질문입니다."])
    interviewer_service._client = fake_client
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
    assert fake_client.messages.calls[0]["model"] == INTERVIEW_MODELS["haiku"]


def test_chat_endpoint_uses_manual_sonnet_selection():
    fake_client = FakeAnthropicClient(["질문입니다."])
    interviewer_service._client = fake_client
    client = TestClient(app)
    session_id = client.post("/sessions").json()["session_id"]

    response = client.post(
        "/chat",
        json={
            "session_id": session_id,
            "message": "회의록 요약을 자주 해요.",
            "model_preference": "sonnet",
            "files": [],
        },
    )

    assert response.status_code == 200
    assert fake_client.messages.calls[0]["model"] == INTERVIEW_MODELS["sonnet"]


def test_chat_endpoint_accepts_multipart_file_content_blocks():
    fake_client = FakeAnthropicClient(["첨부를 확인했어요."])
    interviewer_service._client = fake_client
    client = TestClient(app)
    session_id = client.post("/sessions").json()["session_id"]

    response = client.post(
        "/chat",
        data={
            "session_id": session_id,
            "message": "첨부 파일을 봐주세요.",
            "model_preference": "sonnet",
        },
        files={"file": ("sample.pdf", b"pdf-bytes", "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "첨부를 확인했어요.",
        "ready_to_generate": False,
    }
    assert fake_client.messages.calls[0]["messages"][0] == {
        "role": "user",
        "content": [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": base64.b64encode(b"pdf-bytes").decode("utf-8"),
                },
            },
            {"type": "text", "text": "첨부 파일을 봐주세요."},
        ],
    }
    assert fake_client.messages.calls[0]["model"] == INTERVIEW_MODELS["sonnet"]


def test_auto_model_routes_complex_workflows_to_sonnet():
    model = resolve_interview_model(
        "auto",
        [{"role": "user", "content": "경쟁사 리서치와 전략 옵션 비교를 자주 해요."}],
    )

    assert model == INTERVIEW_MODELS["sonnet"]


def test_auto_model_routes_simple_workflows_to_haiku():
    model = resolve_interview_model(
        "auto",
        [{"role": "user", "content": "회의록을 요약해서 보고서로 정리해요."}],
    )

    assert model == INTERVIEW_MODELS["haiku"]


@pytest.mark.parametrize(
    ("message", "workflow_type"),
    [
        ("회의록을 보고서로 바꿔요.", "transformation"),
        ("제안서를 검토하고 피드백을 줘요.", "review"),
        ("경쟁사를 분석해서 인사이트를 정리해요.", "research"),
        ("고객 인수인계 보고서를 작성해요.", "operational"),
        ("Tableau vs Power BI 검토를 해요.", "decision_support"),
    ],
)
def test_infer_workflow_type_uses_core_reasoning_process(message, workflow_type):
    assert infer_workflow_type([{"role": "user", "content": message}]) == workflow_type


def test_empty_chat_message_starts_interview_with_non_empty_content():
    fake_client = FakeAnthropicClient(["첫 질문입니다."])
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    response = service.chat(session_id, "")

    assert response == {
        "message": "첫 질문입니다.",
        "ready_to_generate": False,
    }
    assert fake_client.messages.calls[0]["messages"][0] == {
        "role": "user",
        "content": START_INTERVIEW_MESSAGE,
    }


def test_interviewer_prompt_checks_capability_only_for_external_sources():
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert "외부 시스템 의존성이 보이지 않으면 묻지 마세요." in prompt
    assert "Salesforce, Outlook, Slack, Confluence, Notion, Google Drive" in prompt
    assert "직접 붙여넣기, 직접 제공, 파일 제공" in prompt
    assert "Agent Capability가 있는 환경" in prompt
    assert "구동 환경을 한 번도 묻지 않은 채로" not in prompt
    assert "1~4가 파악된 후 반드시 한 번은 질문" not in prompt


def test_interviewer_prompt_prioritizes_judgment_criteria_before_output():
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert "인터뷰어 시스템 프롬프트 v0.9" in prompt
    assert "Task Collector가 아니라 Judgement Extractor" in prompt
    assert "핵심 판단 기준" in prompt
    assert "독자, 출력 형식, 공유 방식, 사용 도구, 트리거, 빈도보다 먼저" in prompt
    assert (
        "중요하게 보는 정보, 좋은 결과물의 기준, 판단 기준, 놓치면 안 되는 요소"
        in prompt
    )
    assert "고객 히스토리를 볼 때 특히 중요하게 확인하는 정보" in prompt
    assert "어떤 변화가 있으면 영업에 영향이 있다고 판단" in prompt
    assert '"누가 보나요?", "어디에 공유하나요?", "몇 개를 보나요?"' in prompt


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
