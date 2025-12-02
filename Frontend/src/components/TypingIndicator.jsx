import React from "react";
import { motion } from "framer-motion";

const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-amber-500 rounded-full"
              animate={{
                y: [0, -6, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">Typing...</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;