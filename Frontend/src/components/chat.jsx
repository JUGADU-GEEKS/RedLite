import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import LanguageSelector from "./LanguageSelector";
import { sendChatMessage } from "../services/api.js";
import { MessageCircle, X } from "lucide-react";
import LANG from "../utils/lang.js";

const Chat = ({ initialOpen = false, userCoords = null }) => {
  const [open, setOpen] = useState(initialOpen);
  const [lang, setLang] = useState("en");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef();
  const t = LANG[lang] || LANG.en;

  useEffect(() => {
    const pack = LANG[lang] || LANG.en;
    if (open) {
      if (history.length === 0) {
        setHistory([{
          role: "bot",
          text: pack.greeting,
          ts: Date.now(),
          type: "system"
        }]);
      } else {
        // if first message is a system greeting, update it on language change
        setHistory(prev => {
          if (prev.length > 0 && prev[0]?.type === 'system') {
            const copy = [...prev];
            copy[0] = { ...copy[0], text: pack.greeting };
            return copy;
          }
          return prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lang]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      // jump to bottom when messages change
      try {
        el.scrollTop = el.scrollHeight;
      } catch (e) {
        // fallback to scrollTo if available
        el.scrollTo && el.scrollTo({ top: el.scrollHeight });
      }
    }
  }, [history, loading]);
  
  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const ts = Date.now();
    setHistory(prev => [...prev, { role: "user", text, ts }]);
    setInput("");
    setLoading(true);
    try {
      const resp = await sendChatMessage(text, lang);
      const answer = resp?.answer || t.error_generic;
      setHistory(prev => [...prev, { role: "bot", text: answer, ts: Date.now() }]);
    } catch (e) {
      console.error("[CHAT ERROR]", e);
      const errorMsg = e.message?.includes("Failed") ? t.error_connect : t.error_generic;
      setHistory(prev => [...prev, { role: "bot", text: errorMsg, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-80 md:w-96 bg-white dark:bg-gray-900 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 flex flex-col"
            style={{ height: '80vh', maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 px-5 py-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Traffic Law Assistant
                  </h3>
                  <p className="text-white/90 text-xs mt-1.5 font-medium">Ask about Indian traffic rules & procedures</p>
                </div>
                <motion.button 
                  onClick={() => setOpen(false)} 
                  className="ml-2 p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Language</span>
              <LanguageSelector value={lang} onChange={setLang} />
            </div>

            {/* Quick suggestions based on user location */}
            <div className="p-4 px-5 flex-shrink-0">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const pack = LANG[lang] || LANG.en;
                  const baseSuggestions = [...pack.suggestions];
                  if (userCoords && userCoords.lat && userCoords.lon) {
                    baseSuggestions[3] = pack.suggestion_advisory_nearby(userCoords.lat, userCoords.lon);
                    baseSuggestions.unshift(pack.suggestion_weather_nearby(userCoords.lat, userCoords.lon));
                  }
                  return baseSuggestions.slice(0, 4).map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(sug); setTimeout(() => send(), 50); }}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-amber-100 text-gray-800"
                    >
                      {sug}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Message list */}
              <div
                ref={listRef}
                className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
              >
                {history.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    {t.start_conversation}
                  </div>
                ) : (
                  <>
                    {history.map((m, idx) => (
                      <MessageBubble key={idx} role={m.role} text={m.text} ts={m.ts} />
                    ))}
                    {loading && <TypingIndicator />}
                  </>
                )}
              </div>

            {/* Input */}
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.placeholder}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  disabled={loading}
                  maxLength={500}
                />
                <motion.button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
                  whileHover={{ scale: loading || !input.trim() ? 1 : 1.05 }}
                  whileTap={{ scale: loading || !input.trim() ? 1 : 0.95 }}
                  aria-label="Send message"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    t.send
                  )}
                </motion.button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                {t.greeting}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Button */}
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          className="w-16 h-16 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-amber-500/50 transition-all"
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Open chat"
          title="Traffic Law Assistant"
        >
          <MessageCircle className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </motion.button>
      )}
    </div>
  );
};

export default Chat;