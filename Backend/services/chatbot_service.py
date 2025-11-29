import os
import json
import traceback
from typing import List, Dict, Any, Optional

# Try to import google-generativeai SDK (correct package name)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except Exception as e:
    print(f"[CHATBOT_SERVICE] Failed to import google-generativeai: {e}")
    print("[CHATBOT_SERVICE] Install with: pip install google-generativeai")
    genai = None
    GEMINI_AVAILABLE = False

# Load the laws DB once
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAWS_PATH = os.path.join(_BASE_DIR, "traffic-laws.json")

try:
    with open(LAWS_PATH, "r", encoding="utf-8") as f:
        LAWS_DB = json.load(f)
except Exception as e:
    print(f"[CHATBOT_SERVICE] Failed to load traffic-laws.json: {e}")
    LAWS_DB = {}

# Basic keyword allowlist for traffic topics - expanded for better coverage
TRAFFIC_KEYWORDS = [
    "helmet", "license", "driving license", "dl", "signal", "traffic signal", "signal jump",
    "parking", "illegal parking", "overspeed", "speeding", "drunk", "drunk driving",
    "pothole", "ambulance", "ambulance blocking", "challan", "fine", "court", "mv act",
    "motor vehicles act", "intersection", "traffic", "violation", "penalty", "section",
    "road", "vehicle", "car", "bike", "motorcycle", "bus", "truck", "accident", "crash",
    "lane", "highway", "street", "zebra", "crossing", "pedestrian", "driver", "rider",
    "seatbelt", "insurance", "registration", "rc", "pollution", "puc", "toll", "ticket",
    "traffic police", "rto", "transport", "rules", "regulation", "law", "legal", "illegal"
]

# Mapping keywords -> law keys in LAWS_DB
KEY_TO_LAW = {
    "helmet": "helmet",
    "license": "no_license",
    "driving license": "no_license",
    "dl": "no_license",
    "signal": "signal_jump",
    "signal jump": "signal_jump",
    "traffic signal": "signal_jump",
    "parking": "illegal_parking",
    "illegal parking": "illegal_parking",
    "speed": "overspeeding",
    "overspeed": "overspeeding",
    "speeding": "overspeeding",
    "drunk": "drunk_driving",
    "drunk driving": "drunk_driving",
    "pothole": "pothole_reporting",
    "ambulance": "ambulance_blocking",
    "ambulance blocking": "ambulance_blocking",
    "challan": "no_license",
    "fine": "overspeeding"
}


def is_traffic_related(message: str) -> bool:
    """Return True if the message appears traffic-related using allowlist keywords."""
    if not message:
        return False
    msg = message.lower()
    for kw in TRAFFIC_KEYWORDS:
        if kw in msg:
            return True
    return False


def find_law_context(message: str) -> List[str]:
    """Return list of law keys that match the message via simple keyword mapping."""
    if not message:
        return []
    msg = message.lower()
    found: List[str] = []
    for kw, law_key in KEY_TO_LAW.items():
        if kw in msg and law_key in LAWS_DB and law_key not in found:
            found.append(law_key)
    return found


def build_prompt(message: str, language: str, contexts: List[str]) -> str:
    """Build a RAG-style prompt with injected contexts and a system instruction."""
    system = (
        "You are a Traffic Law Assistant for India. Your ONLY purpose is to answer questions about "
        "Indian traffic laws, rules, fines, challans, court procedures, and traffic-related scenarios. "
        "\n\nCRITICAL RULES:\n"
        "1. If the question is NOT about traffic laws, traffic rules, traffic violations, fines, challans, "
        "court procedures, or any traffic/road/vehicle-related topic, you MUST reply EXACTLY: "
        "\"I can't help you with that.\"\n"
        "2. Do NOT answer questions about general knowledge, weather, sports, entertainment, politics, "
        "or any non-traffic topics.\n"
        "3. Keep answers concise, clear, and actionable.\n"
        "4. Always cite specific sections and fine amounts when available from the provided context.\n"
        "5. If you're unsure whether a question is traffic-related, err on the side of caution and say "
        "\"I can't help you with that.\""
    )
    
    lang_notice = {
        "en": "Answer in English.",
        "hi": "Answer in Hindi (हिंदी में उत्तर दें).",
        "or": "Answer in Odia (ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅନ୍ତୁ)."
    }.get(language, "Answer in English.")
    
    injected = ""
    if contexts:
        injected += "Relevant law snippets (use these to ground your answer):\n\n"
        for k in contexts:
            entry = LAWS_DB.get(k)
            if not entry:
                continue
            title = entry.get("title", "")
            section = entry.get("section", "")
            fine = entry.get("fine", "")
            court = "Yes" if entry.get("court_required") else "No"
            short = entry.get(f"short_{language}", entry.get("short_en", ""))
            details = entry.get(f"details_{language}", entry.get("details_en", ""))
            
            injected += f"- {title} (key: {k})\n"
            injected += f"  Section: {section}\n"
            injected += f"  Fine: {fine}\n"
            injected += f"  Court Required: {court}\n"
            injected += f"  Summary: {short}\n"
            injected += f"  Details: {details}\n\n"
    
    prompt = (
        f"{system}\n\n{lang_notice}\n\n"
        f"{injected}\n"
        f"User question:\n{message}\n\n"
        f"IMPORTANT INSTRUCTIONS:\n"
        f"- Provide a DYNAMIC, conversational answer based on the context provided above.\n"
        f"- Do NOT simply copy-paste the context. Instead, synthesize the information and provide a natural, helpful response.\n"
        f"- If the question asks about a specific scenario, provide relevant advice based on the laws.\n"
        f"- If a fine or section is mentioned in the context, include it naturally in your answer.\n"
        f"- If court is required, mention it clearly.\n"
        f"- Make your answer sound natural and conversational, not robotic.\n"
        f"- If the question is not traffic-related, reply exactly: \"I can't help you with that.\"\n"
        f"- Keep the answer concise (2-4 sentences) but informative."
    )
    return prompt


def _local_fallback_answer(language: str, contexts: List[str]) -> Dict[str, Any]:
    """
    Deterministic local RAG-style answer using the bundled traffic-laws DB.
    Used when Gemini is unavailable or errors, so the chatbot still works.
    """
    try:
        if not contexts:
            return {
                "text": "I can't help you with that.",
                "raw": {"local_fallback": True, "reason": "no_matching_context"},
            }
        
        parts = []
        for k in contexts:
            entry = LAWS_DB.get(k)
            if not entry:
                continue
            
            title = entry.get("title", "")
            section = entry.get("section", "")
            fine = entry.get("fine", "")
            court = "Yes" if entry.get("court_required") else "No"
            short = entry.get(f"short_{language}", entry.get("short_en", ""))
            details = entry.get(f"details_{language}", entry.get("details_en", ""))
            
            parts.append(
                f"{title}\n"
                f"{short}\n"
                f"Section: {section}\n"
                f"Fine: {fine}\n"
                f"Court required: {court}\n"
                f"{details}"
            )
        
        answer = "\n\n".join(parts) if parts else "No matching law details found."
        return {"text": answer, "raw": {"local_fallback": True}}
        
    except Exception as e:
        tb = traceback.format_exc()
        print("[CHATBOT_SERVICE][LOCAL FALLBACK ERROR]", tb)
        return {
            "text": "Local fallback failed. See server logs.",
            "raw": {"error": str(e), "trace": tb},
        }


def call_gemini(
    prompt: str, 
    temperature: float = 0.0, 
    language: str = "en", 
    contexts: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Use google-genai SDK if GEMINI_API_KEY is set and SDK available.
    On any failure we gracefully fall back to the local RAG answer so the
    chatbot never returns a low-level 'Error contacting Gemini API' message.
    """
    key = os.environ.get("GEMINI_API_KEY")
    print("[CHATBOT_SERVICE] GEMINI_API_KEY present:", bool(key))
    print("[CHATBOT_SERVICE] GEMINI_AVAILABLE:", GEMINI_AVAILABLE)
    
    # Local deterministic fallback when key/SDK not available
    if not key or not GEMINI_AVAILABLE or genai is None:
        print("[CHATBOT_SERVICE] Falling back to local RAG (no API key or SDK)")
        print("[CHATBOT_SERVICE] To enable Gemini: Set GEMINI_API_KEY and install: pip install google-generativeai")
        return _local_fallback_answer(language, contexts or [])
    
    # Real Gemini call path - using correct google-generativeai SDK
    try:
        # Configure the API key
        genai.configure(api_key=key)
        
        # Use the GenerativeModel API (correct way)
        # Try gemini-2.0-flash-exp first, fallback to gemini-pro if needed
        model_name = "gemini-2.0-flash-exp"
        try:
            model = genai.GenerativeModel(model_name)
        except Exception:
            # Fallback to gemini-pro if flash model not available
            model_name = "gemini-pro"
            model = genai.GenerativeModel(model_name)
            print(f"[CHATBOT_SERVICE] Using fallback model: {model_name}")
        
        print(f"[CHATBOT_SERVICE] Calling Gemini API with model: {model_name}")
        
        # Generate content with proper configuration
        generation_config = {
            "temperature": temperature,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        print("[CHATBOT_SERVICE] Gemini API call completed successfully")
        print(f"[CHATBOT_SERVICE] Response type: {type(response)}")
        
        # Extract text from response - google-generativeai returns response.text directly
        text = None
        try:
            if hasattr(response, "text") and response.text:
                text = response.text
            elif hasattr(response, "candidates") and response.candidates:
                # Fallback: extract from candidates
                candidate = response.candidates[0]
                if hasattr(candidate, "content"):
                    parts = candidate.content.parts
                    if parts and len(parts) > 0:
                        text = parts[0].text if hasattr(parts[0], "text") else str(parts[0])
            elif hasattr(response, "parts") and response.parts:
                # Another fallback structure
                text = response.parts[0].text if hasattr(response.parts[0], "text") else str(response.parts[0])
        except Exception as e:
            print(f"[CHATBOT_SERVICE] Error extracting text: {e}")
            print(f"[CHATBOT_SERVICE] Response object: {response}")
            text = None
        
        if not text or not text.strip():
            raise ValueError("Empty response from Gemini API")
        
        print(f"[CHATBOT_SERVICE] Successfully extracted {len(text)} characters from Gemini response")
        return {"text": text.strip(), "raw": {"gemini_response": True, "model": model_name}}
        
    except Exception as e:
        tb = traceback.format_exc()
        print("[CHATBOT_SERVICE][GEMINI SDK ERROR]", tb)
        
        # Gracefully fall back to local RAG answer
        fallback = _local_fallback_answer(language, contexts or [])
        fallback["raw"]["gemini_error"] = str(e)
        return fallback