import os
import traceback
from typing import Dict, Any, Optional

# Try to import google-generativeai SDK (correct package name)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except Exception as e:
    print(f"[CHATBOT_SERVICE] Failed to import google-generativeai: {e}")
    print("[CHATBOT_SERVICE] Install with: pip install google-generativeai")
    genai = None
    GEMINI_AVAILABLE = False


def _build_system_prompt(language: str = "en") -> str:
    """Build a system instruction for the Gemini model.

    The assistant represents the Odisha Government. It should answer both
    traffic-rule related queries (with Odisha/India context) and weather
    inquiries for Odisha regions. Keep answers concise and use the requested
    language (en/hi/or). Do not assert real-time sensor data — if asked for
    up-to-the-minute weather, ask for permission to use a location or state
    that authoritative MET office should be consulted for live updates.
    """
    lang_notice = {
        "en": "Answer in English.",
        "hi": "Answer in Hindi (हिंदी में उत्तर दें).",
        "or": "Answer in Odia (ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅନ୍ତୁ)."
    }.get(language, "Answer in English.")

    system = (
    "You are an official Odisha Government Virtual Assistant. Your responsibilities:"
    "\n\n1) Traffic & Transport Support"
    "\n- Answer questions about traffic rules, fines, challans, violations, reporting procedures, and road-safety guidelines in Odisha and India."
    "\n- When referencing laws, only cite statute names or fine ranges if you are fully confident; otherwise provide procedural and advisory guidance."
    "\n- Maintain a neutral, official, and concise tone (2–4 sentences)."
    
    "\n\n2) Weather Information"
    "\n- When asked about weather, ALWAYS fetch and provide current conditions, forecasts, and advisories by searching the internet."
    "\n- Accept coordinates (latitude/longitude) or location names and use web search to retrieve real weather data."
    "\n- Include the source if the model provides citations."
    "\n- Only if weather information truly cannot be found, politely advise checking IMD or local authorities — never as the first response."

    "\n\n3) Language"
    "\n- Respond in the language requested by the user."

    "\n\n4) Tone & Style"
    "\n- Be concise, factual, and helpful like a government information desk."
    "\n- Avoid speculation. Do not generate fabricated statistics, timestamps, or sensor readings — only use verifiable online data."

    "\n\n5) Safety & Boundaries"
    "\n- Do not provide personal data, confidential government information, or legal interpretations."
    "\n- Do not generate emergency alerts unless confirmed by reputable public data found during search."

    "\n\nPrimary functions:"
    "\n- Provide real-time weather via web search."
    "\n- Provide accurate traffic-rule guidance."
    "\n- Maintain an official but friendly tone."

    "\n\nNow respond to the user's query."
)

    return system


def call_gemini(
    message: str,
    temperature: float = 0.3,
    language: str = "en",
    ) -> Dict[str, Any]:
    """
    Use google-genai SDK if GEMINI_API_KEY is set and SDK available.
    On any failure we gracefully fall back to the local RAG answer so the
    chatbot never returns a low-level 'Error contacting Gemini API' message.
    """
    key = os.environ.get("GEMINI_API_KEY")
    print("[CHATBOT_SERVICE] GEMINI_API_KEY present:", bool(key))
    print("[CHATBOT_SERVICE] GEMINI_AVAILABLE:", GEMINI_AVAILABLE)

    if not key or not GEMINI_AVAILABLE or genai is None:
        # No API configured - return an explanatory message
        return {"text": "Chatbot is not configured with Gemini API key. Please set GEMINI_API_KEY on the server.", "raw": {"gemini_response": False}}

    try:
        genai.configure(api_key=key)

        model_name = "gemini-2.5-flash"
        try:
            model = genai.GenerativeModel(model_name)
        except Exception:
            model_name = "gemini-pro"
            model = genai.GenerativeModel(model_name)

        print(f"[CHATBOT_SERVICE] Calling Gemini API with model: {model_name}")

        system = _build_system_prompt(language)
        full_prompt = f"{system}\nUser question:\n{message}\n"

        # Increase max_output_tokens to allow longer answers. Adjust if needed.
        # Note: some Gemini models support very large outputs; 4096 is a safe increase.
        generation_config = {
            "temperature": temperature,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 4096,
            # Return a single candidate by default
            "candidate_count": 1,
        }

        print(f"[CHATBOT_SERVICE] Generation config: {generation_config}")

        response = model.generate_content(full_prompt, generation_config=generation_config)

        print("[CHATBOT_SERVICE] Gemini API call completed successfully")

        text = None
        try:
            # SDK may expose different fields depending on version; try several
            if hasattr(response, "text") and response.text:
                text = response.text
            elif hasattr(response, "candidates") and response.candidates:
                # Iterate candidates and try to extract any available parts
                for candidate in response.candidates:
                    # candidate.content may have a 'parts' sequence
                    if hasattr(candidate, "content"):
                        content = candidate.content
                        parts = getattr(content, "parts", None)
                        if parts:
                            first = parts[0]
                            text = getattr(first, "text", None) or str(first)
                            if text:
                                break
                        # Some candidate.content may directly expose a 'text' attribute
                        text = getattr(content, "text", None) or text
                        if text:
                            break
                    # Fallback: candidate may have direct text
                    text = getattr(candidate, "text", None) or text
                    if text:
                        break
            elif hasattr(response, "parts") and response.parts:
                first = response.parts[0]
                text = getattr(first, "text", None) or str(first)
        except Exception as e:
            print(f"[CHATBOT_SERVICE] Error extracting text: {e}")
            print(f"[CHATBOT_SERVICE] Response object: {response}")
            text = None

        if not text or not text.strip():
            # Don't raise; return a helpful message and include raw response for debugging
            print("[CHATBOT_SERVICE] Empty or no text returned by Gemini API (possibly truncated or MAX_TOKENS)")
            return {
                "text": "",
                "raw": {"gemini_response": True, "model": model_name, "response": response}
            }

        return {"text": text.strip(), "raw": {"gemini_response": True, "model": model_name}}

    except Exception as e:
        tb = traceback.format_exc()
        print("[CHATBOT_SERVICE][GEMINI SDK ERROR]", tb)
        return {"text": "Unable to contact Gemini API. Please check server configuration.", "raw": {"gemini_response": False, "error": str(e)}}