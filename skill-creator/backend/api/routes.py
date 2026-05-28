from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.generator import generator_service
from services.interviewer import interviewer_service

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
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


class GenerateResponse(BaseModel):
    skill_md: str
    summary: SummaryResponse


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        return interviewer_service.chat(request.session_id, request.message)
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
