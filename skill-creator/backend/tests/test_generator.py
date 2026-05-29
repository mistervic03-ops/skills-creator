import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.generator import (
    GENERATION_MODEL,
    SUMMARY_SEPARATOR,
    GeneratorService,
    generator_service,
)
from services.interviewer import interviewer_service


PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "generator.md"


SUMMARY = {
    "trigger": "회의가 끝난 뒤 결정사항과 할 일을 정리할 때 사용합니다.",
    "inputs": "회의 녹취록과 안건 목록을 준비합니다.",
    "output_format": "핵심 결정사항과 담당자별 할 일을 짧은 목록으로 출력합니다.",
    "audience": "팀 리더",
    "environment": "Slack에 공유할 수 있는 환경에서 사용할 때 가장 좋습니다.",
    "workflow_type": "transformation",
}
EMPTY_SUMMARY = {
    "trigger": "",
    "inputs": "",
    "output_format": "",
    "audience": "",
    "environment": "",
    "workflow_type": "operational",
}


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
workflow_type: transformation
---

# 회의록 요약

## When to Use
회의가 끝난 뒤 결정사항과 할 일을 정리할 때 사용합니다.

## Inputs
회의 녹취록과 안건 목록을 준비합니다.

## Workflow
결정사항과 할 일을 분리해서 작성합니다.

## Output Format
핵심 결정사항과 담당자별 할 일을 짧은 목록으로 출력합니다.

## Success Criteria
팀 리더가 회의 후속 작업을 바로 진행할 수 있습니다.

## Validation Checklist
- [ ] 결정사항이 누락되지 않았는가
- [ ] 담당자별 할 일이 구분되어 있는가

## Notes
인터뷰에서 언급되지 않은 내용을 추가하지 않습니다.

## Environment Setup
Slack에 공유할 수 있는 환경에서 사용할 때 가장 좋습니다."""


def generation_response(
    description="Use this skill when summarizing team meeting notes.",
    summary=SUMMARY,
):
    return f"""{skill_md(description)}
{SUMMARY_SEPARATOR}
{json.dumps(summary, ensure_ascii=False, indent=2)}"""


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
    fake_client = FakeAnthropicClient([generation_response()])
    generator_service._client = fake_client
    client = TestClient(app)

    response = client.post("/generate", json={"session_id": session_id})

    assert response.status_code == 200
    body = response.json()
    assert body["skill_md"] == skill_md()
    assert body["summary"] == SUMMARY
    assert fake_client.messages.calls[0]["model"] == GENERATION_MODEL
    assert fake_client.messages.calls[0]["messages"][
        :-1
    ] == interviewer_service.get_history(session_id)
    assert len(interviewer_service.get_history(session_id)) == 2


def test_generator_prompt_requires_confirmed_agent_capability_for_environment():
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert "AI가 해당 도구에 직접 접근 가능한 환경이라고 확인된 경우에만 작성" in prompt
    assert "직접 제공하거나, 파일로 제공한다고 답한 경우" in prompt
    assert "Environment Setup을 작성하지 말고 해당 자료를 Inputs에 반영" in prompt
    assert "환경 전제 조건만 작성한다." in prompt
    assert "이 스킬은 Outlook 및 Slack 접근 가능한 환경을 전제로 한다." in prompt
    assert (
        "연동이 없는 경우: 사용자에게 관련 내용을 직접 붙여넣도록 요청한다." in prompt
    )
    assert (
        "외부 시스템이나 외부 자료 출처가 등장한 경우에만 6번도 반영하세요." in prompt
    )
    assert "다섯 가지를 반드시 파악한 뒤 작성을 시작하세요." not in prompt


def test_generator_prompt_forbids_domain_inference():
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert "생성기 시스템 프롬프트 v1.0" in prompt
    assert "좋은 업무 템플릿을 새로 만드는 것이 아니라" in prompt
    assert "도메인 지식이나 일반적인 베스트 프랙티스를 보태지 마세요." in prompt
    assert (
        "좋은 업무 방법 생성이 아니라 사용자가 설명한 실제 업무 방식 구조화" in prompt
    )
    assert "기간" in prompt
    assert "역할" in prompt
    assert "조직 구조" in prompt
    assert "데이터 필드" in prompt
    assert "세부 카테고리" in prompt
    assert "최근 3개월 이메일" in prompt
    assert "최근 미팅 내용" in prompt
    assert "Opportunity 규모" in prompt
    assert "의사결정권자" in prompt
    assert "실무진" in prompt
    assert "최근 이메일" in prompt
    assert "최근 고객 이슈" in prompt
    assert "주요 담당자" in prompt
    assert "진행 중인 기회" in prompt
    assert (
        "Capability가 있더라도 인터뷰에서 언급되지 않은 정보 유형은 추가하지 마세요."
        in prompt
    )


def test_generator_prompt_blocks_agent_actions_without_capability():
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert "Capability 기반 Agent 행동 제한" in prompt
    assert (
        "Capability가 확인되기 전에는 AI가 외부 시스템이나 웹에 직접 접근하는 행동"
        in prompt
    )
    assert "Salesforce 검색" in prompt
    assert "Slack 검색" in prompt
    assert "Outlook 검색" in prompt
    assert "경쟁사 홈페이지 분석" in prompt
    assert "웹사이트 크롤링" in prompt
    assert "제공된 Salesforce 자료 검토" in prompt
    assert "제공된 이메일 기록 검토" in prompt
    assert "제공된 경쟁사 자료 검토" in prompt
    assert '"제공된 자료를 검토한다"' in prompt


def test_generator_prompt_classifies_workflow_type_by_core_reasoning_process():
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert (
        "workflow_type은 업무 목적을 먼저 보고, 그 다음 핵심 사고 과정을 보고 결정한다."
        in prompt
    )
    assert "최종 산출물의 형식으로 결정하지 않는다." in prompt
    assert "담당자 인수인계나 고객 상황 이해 같은 운영 수행이면 operational" in prompt
    assert (
        "`보고서`, `정리`, `문서`, `메일` 같은 출력 형태만 보고 transformation"
        in prompt
    )
    assert "회의록 → 보고서: transformation" in prompt
    assert "제안서 검토: review" in prompt
    assert "경쟁사 분석: research" in prompt
    assert "고객 인수인계: operational" in prompt
    assert "Tableau vs Power BI 검토: decision_support" in prompt


def test_korean_description_triggers_regeneration():
    fake_client = FakeAnthropicClient(
        [
            generation_response("회의록을 요약할 때 사용합니다."),
            generation_response(),
        ]
    )
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == skill_md()
    assert len(fake_client.messages.calls) == 2
    assert (
        "description 값에 한글"
        in fake_client.messages.calls[1]["messages"][-1]["content"]
    )


def test_missing_required_section_triggers_regeneration():
    missing_output_format = skill_md().replace(
        "## Output Format\n핵심 결정사항과 담당자별 할 일을 짧은 목록으로 출력합니다.\n\n",
        "",
    )
    fake_client = FakeAnthropicClient(
        [
            f"{missing_output_format}\n{SUMMARY_SEPARATOR}\n{{}}",
            generation_response(),
        ]
    )
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == skill_md()
    assert len(fake_client.messages.calls) == 2
    assert (
        "## Output Format 섹션이 없습니다."
        in fake_client.messages.calls[1]["messages"][-1]["content"]
    )


def test_summary_parse_failure_returns_empty_summary():
    fake_client = FakeAnthropicClient([f"{skill_md()}\n{SUMMARY_SEPARATOR}\nnot-json"])
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == skill_md()
    assert result["summary"] == EMPTY_SUMMARY


def test_summary_parses_workflow_type_when_present():
    fake_client = FakeAnthropicClient([generation_response()])
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["summary"]["workflow_type"] == "transformation"


def test_summary_defaults_workflow_type_when_missing():
    summary_without_workflow_type = {
        key: value for key, value in SUMMARY.items() if key != "workflow_type"
    }
    fake_client = FakeAnthropicClient(
        [generation_response(summary=summary_without_workflow_type)]
    )
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["summary"]["workflow_type"] == "operational"


def test_summary_defaults_workflow_type_when_invalid():
    invalid_summary = {**SUMMARY, "workflow_type": "planning"}
    fake_client = FakeAnthropicClient([generation_response(summary=invalid_summary)])
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["summary"]["workflow_type"] == "operational"


def test_returns_last_result_after_two_retries_are_exhausted():
    first = generation_response("첫 번째 실패입니다.")
    second = generation_response("두 번째 실패입니다.")
    third = generation_response("세 번째 실패입니다.")
    fake_client = FakeAnthropicClient([first, second, third])
    service = GeneratorService(client=fake_client)

    result = service.generate([{"role": "user", "content": "회의록 요약"}])

    assert result["skill_md"] == skill_md("세 번째 실패입니다.")
    assert len(fake_client.messages.calls) == 3
