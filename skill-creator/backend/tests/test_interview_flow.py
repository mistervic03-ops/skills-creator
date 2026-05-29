import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.interviewer import InterviewerService


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


def test_normal_flow_completes_with_ready_tag_removed():
    fake_client = FakeAnthropicClient(
        [
            "언제 이 일을 반복하시나요?",
            "시작할 때 필요한 자료는 무엇인가요?",
            "결과물은 어떤 형식이면 좋을까요?",
            "누가 이 결과물을 보나요?",
            "충분히 파악됐어요. 스킬을 만들어볼게요! <READY_TO_GENERATE>",
        ]
    )
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    user_messages = [
        "회의가 끝날 때마다 회의록을 정리해요.",
        "녹취록과 회의 안건이 필요해요.",
        "핵심 결정사항과 할 일을 짧은 문단으로 받고 싶어요.",
        "팀원과 리더가 슬랙에서 봅니다.",
        "네, 그 정도면 충분해요.",
    ]

    responses = [service.chat(session_id, message) for message in user_messages]
    final_response = responses[-1]

    assert final_response["ready_to_generate"] is True
    assert "<READY_TO_GENERATE>" not in final_response["message"]
    assert final_response["message"] == "충분히 파악됐어요. 스킬을 만들어볼게요!"
    assert len(service.get_history(session_id)) == 10


def test_seventh_turn_forces_completion_with_ready_tag():
    fake_client = FakeAnthropicClient(
        [
            "어떤 업무를 자주 반복하고 계세요?",
            "그 일을 언제 시작하시나요?",
            "필요한 자료는 무엇인가요?",
            "결과물은 어떤 모습이면 좋을까요?",
            "누가 결과물을 보나요?",
            "주로 어디에서 사용하실 예정인가요?",
            "파악된 내용으로 만들어볼게요. <READY_TO_GENERATE>",
        ]
    )
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    responses = [
        service.chat(session_id, f"{turn}번째 답변입니다.") for turn in range(1, 8)
    ]

    assert all(response["ready_to_generate"] is False for response in responses[:6])
    assert responses[6]["ready_to_generate"] is True
    assert "<READY_TO_GENERATE>" not in responses[6]["message"]
    assert len(fake_client.messages.calls) == 7


def test_revision_after_completion_keeps_history_and_continues_interview():
    fake_client = FakeAnthropicClient(
        [
            "언제 이 일을 반복하시나요?",
            "충분히 파악됐어요. 스킬을 만들어볼게요! <READY_TO_GENERATE>",
            "좋아요. 어떤 부분을 수정하고 싶으세요?",
        ]
    )
    service = InterviewerService(client=fake_client)
    session_id = service.create_session()

    service.chat(session_id, "주간 보고서를 작성할 때 필요해요.")
    completed_response = service.chat(
        session_id,
        "입력은 업무 기록이고 출력은 임원용 요약입니다.",
    )
    history_after_completion = list(service.get_history(session_id))

    revision_response = service.chat(session_id, "수정할게요. 독자는 팀장입니다.")
    history_after_revision = service.get_history(session_id)

    assert completed_response["ready_to_generate"] is True
    assert revision_response["ready_to_generate"] is False
    assert len(history_after_revision) == len(history_after_completion) + 2
    assert (
        history_after_revision[: len(history_after_completion)]
        == history_after_completion
    )
    assert history_after_revision[-2] == {
        "role": "user",
        "content": "수정할게요. 독자는 팀장입니다.",
    }
    assert history_after_revision[-1] == {
        "role": "assistant",
        "content": "좋아요. 어떤 부분을 수정하고 싶으세요?",
    }
