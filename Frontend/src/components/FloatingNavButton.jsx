import React from 'react';

const FloatingNavButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed top-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 backdrop-blur-2xl border border-slate-500/40 shadow-2xl hover:shadow-slate-600/60 flex items-center justify-center text-white transition-all duration-500 ease-out hover:scale-110 active:scale-95 group"
    >
      <svg
        className="w-6 h-6 transition-all duration-500 ease-out group-hover:rotate-90 group-hover:drop-shadow-lg"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      
      <span className="absolute inset-0 rounded-full bg-slate-400/20 animate-pulse"></span>
      <span className="absolute top-1 left-1 w-5 h-5 bg-white/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
    </button>
  );
};

export default FloatingNavButton;