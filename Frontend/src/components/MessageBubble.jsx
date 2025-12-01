import React from "react";
import { motion } from "framer-motion";

const MessageBubble = ({ role, text, ts }) => {
  const isBot = role === "bot";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isBot ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isBot
            ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none shadow-sm border border-gray-200 dark:border-gray-700"
            : "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-tr-none shadow-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
        <span className={`text-xs mt-2 block ${
          isBot ? "text-gray-500 dark:text-gray-400" : "text-white/80"
        }`}>
          {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

export default MessageBubble;