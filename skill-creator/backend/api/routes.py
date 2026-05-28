from fastapi import APIRouter

router = APIRouter()

@router.post("/chat")
async def chat():
    # Phase 1에서 구현
    return {"message": "not implemented", "ready_to_generate": False}

@router.post("/generate")
async def generate():
    # Phase 2에서 구현
    return {"skill_md": "not implemented", "summary": {}}

@router.post("/sessions")
async def create_session():
    # Phase 1에서 구현
    return {"session_id": "not implemented"}
