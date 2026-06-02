from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.file_processor import (
    ProcessedFile,
    UnsupportedFileTypeError,
    process_file,
)
from services.generator import generator_service
from services.interviewer import interviewer_service
from services.skill_library import (
    InvalidSkillIdError,
    SkillNotFoundError,
    skill_library_service,
)

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    model_preference: str = "auto"
    files: list[object] = Field(default_factory=list)


class ChatResponse(BaseModel):
    message: str
    ready_to_generate: bool


class SessionResponse(BaseModel):
    session_id: str


class GenerateRequest(BaseModel):
    session_id: str


class SummaryResponse(BaseModel):
    trigger: str
    inputs: str
    output_format: str
    audience: str
    environment: str
    workflow_type: str


class GenerateResponse(BaseModel):
    skill_md: str
    summary: SummaryResponse


class SaveSkillRequest(BaseModel):
    skill_md: str
    author: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request):
    try:
        session_id, message, files, model_preference = await _parse_chat_request(
            request
        )
        processed_files = [
            process_file(
                filename=file["filename"],
                file_bytes=file["content"],
                content_type=file["content_type"],
            )
            for file in files
        ]
        return interviewer_service.chat(
            session_id,
            _build_anthropic_user_content(message, processed_files),
            model_preference,
        )
    except UnsupportedFileTypeError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": str(exc)},
        )
    except RuntimeError as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(exc)},
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    try:
        history = interviewer_service.get_history(request.session_id)
        return generator_service.generate(history)
    except RuntimeError as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(exc)},
        )


@router.post("/sessions", response_model=SessionResponse)
async def create_session():
    return {"session_id": interviewer_service.create_session()}


@router.post("/skills")
async def save_skill(request: SaveSkillRequest):
    return skill_library_service.save_skill(request.skill_md, request.author)


@router.get("/skills")
async def list_skills(q: Optional[str] = None):
    return skill_library_service.list_skills(q)


@router.get("/skills/{skill_id}")
async def get_skill(skill_id: str):
    try:
        return skill_library_service.get_skill(skill_id)
    except InvalidSkillIdError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Invalid skill id"},
        )
    except SkillNotFoundError:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Skill not found"},
        )


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str):
    try:
        skill_library_service.delete_skill(skill_id)
    except InvalidSkillIdError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Invalid skill id"},
        )
    except SkillNotFoundError:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Skill not found"},
        )
    return {"deleted": True}


async def _parse_chat_request(
    request: Request,
) -> tuple[str, str, list[dict[str, object]], str]:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        files: list[dict[str, object]] = []
        for key, value in form.multi_items():
            if key not in {"file", "files"} or not hasattr(value, "filename"):
                continue
            if not value.filename:
                continue
            files.append(
                {
                    "filename": value.filename,
                    "content": await value.read(),
                    "content_type": value.content_type,
                }
            )

        return (
            str(form.get("session_id", "")),
            str(form.get("message", "")),
            files,
            str(form.get("model_preference", "auto")),
        )

    payload = ChatRequest.model_validate(await request.json())
    return payload.session_id, payload.message, [], payload.model_preference


def _build_anthropic_user_content(
    message: str,
    processed_files: list[ProcessedFile],
) -> str | list[dict[str, object]]:
    text = message
    content_blocks: list[dict[str, object]] = []

    for processed_file in processed_files:
        if processed_file.kind == "text":
            text += f"\n\n[첨부 파일 내용]\n{processed_file.content}"
        else:
            content_blocks.extend(processed_file.content)

    if not content_blocks:
        return text

    return [
        *content_blocks,
        {"type": "text", "text": text},
    ]
