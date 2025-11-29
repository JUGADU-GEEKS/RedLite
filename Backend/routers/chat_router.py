from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from services.chatbot_service import (
    is_traffic_related,
    find_law_context,
    build_prompt,
    call_gemini,
    _local_fallback_answer
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
    
    # Traffic-only guard
    if not is_traffic_related(message):
        return {
            "answer": "I can't help you with that.",
            "injected_context": [],
            "language": language
        }
    
    # Find law contexts
    matched_keys = find_law_context(message)
    
    # If no matching contexts found, still reject
    if not matched_keys:
        return {
            "answer": "I can't help you with that.",
            "injected_context": [],
            "language": language
        }
    
    # Build RAG prompt with contexts
    prompt = build_prompt(message, language, matched_keys)
    
    # Call Gemini API (with fallback to local RAG only if Gemini fails)
    gemini_response = call_gemini(prompt, temperature=0.3, language=language, contexts=matched_keys)
    answer_text = gemini_response.get("text", "I can't help you with that.")
    
    # Check if this was a Gemini response or fallback
    is_gemini_response = gemini_response.get("raw", {}).get("gemini_response", False)
    
    # Only validate if it's a Gemini response (not fallback)
    if is_gemini_response:
        answer_lower = answer_text.lower()
        # If Gemini explicitly says it can't help, respect that
        if "can't help" in answer_lower or "cannot help" in answer_lower:
            answer_text = "I can't help you with that."
        # Otherwise, trust Gemini's dynamic response - it has the context
        # Don't force fallback just because answer doesn't contain keywords
    else:
        # This is a fallback response, validate it
        answer_lower = answer_text.lower()
        if not is_traffic_related(answer_text) and "can't help" not in answer_lower:
            # Fallback gave non-traffic answer, use static response
            fallback_resp = _local_fallback_answer(language, matched_keys)
            answer_text = fallback_resp.get("text", "I can't help you with that.")
    
    # Final safety check - only for non-Gemini responses
    if not is_gemini_response and not matched_keys and answer_text.lower() != "i can't help you with that.":
        answer_text = "I can't help you with that."
    
    return {
        "answer": answer_text,
        "injected_context": matched_keys,
        "language": language
    }