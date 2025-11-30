from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from services.chatbot_service import (
    call_gemini,
)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/chat")
async def chat(payload: dict = Body(...)):
    """
    POST /chatbot/chat
    Body: { "message": "<user message>", "language": "en"|"hi"|"or" }
    Returns: { "answer": "<response>", "injected_context": [...], "language": "en" }
    """
    message = (payload.get("message") or "").strip()
    language = payload.get("language", "en")
    
    if not message:
        raise HTTPException(status_code=400, detail="message required")
    
    # Forward the message to Gemini-based service. The service builds
    # an appropriate system prompt (Odisha Govt assistant: traffic + weather)
    gemini_response = call_gemini(message, temperature=0.3, language=language)
    answer_text = gemini_response.get("text", "")

    return {
        "answer": answer_text,
        "injected_context": [],
        "language": language
    }