const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Send a chat message to the chatbot endpoint
 * @param {string} message - User's message
 * @param {string} language - Language code: "en", "hi", or "or"
 * @returns {Promise<{answer: string, injected_context: string[], language: string}>}
 */
export async function sendChatMessage(message, language = "en") {
  try {
    const res = await fetch(`${API_BASE}/chatbot/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to send chat message");
    }

    const data = await res.json();
    return data; // { answer, injected_context, language }
  } catch (error) {
    console.error("[CHAT API ERROR]", error);
    throw error;
  }
}

