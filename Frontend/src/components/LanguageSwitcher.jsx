import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'od', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  ];

  const currentLang = i18n.language || 'en';

  const switchLanguage = (langCode) => {
    if (langCode === currentLang) return;

    // Get current path without language prefix
    let path = location.pathname;
    const langMatch = path.match(/^\/(en|hi|od)(\/.*)?$/);
    
    let pathWithoutLang = '/';
    if (langMatch && langMatch[2]) {
      // Extract path without language prefix
      pathWithoutLang = langMatch[2];
      // Ensure it starts with /
      if (!pathWithoutLang.startsWith('/')) {
        pathWithoutLang = '/' + pathWithoutLang;
      }
    } else if (langMatch) {
      // Just language prefix, no path
      pathWithoutLang = '/';
    } else if (path !== '/') {
      // No lang prefix found, use full path
      pathWithoutLang = path.startsWith('/') ? path : '/' + path;
    }

    // Build new path with language prefix
    // If pathWithoutLang is just '/', we need /:lang/ format
    const newPath = pathWithoutLang === '/' 
      ? `/${langCode}/`
      : `/${langCode}${pathWithoutLang}`;

    // Update language globally - this will trigger re-render of ALL components using useTranslation
    i18n.changeLanguage(langCode).then(() => {
      // Navigate after language change completes
      navigate(newPath, { replace: true });
      // Force a small delay to ensure all components have received the language change event
      setTimeout(() => {
        // Trigger a custom event to ensure all components update
        window.dispatchEvent(new Event('languagechange'));
      }, 50);
    }).catch(err => {
      console.error('Failed to change language:', err);
      // Navigate anyway
      navigate(newPath, { replace: true });
    });
  };

  return (
    <div className="relative group">
      <motion.button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-300 text-gray-700 font-medium"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Switch Language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">
          {languages.find(l => l.code === currentLang)?.native || 'EN'}
        </span>
      </motion.button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 top-full mt-2 w-40 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
        <div className="py-2">
          {languages.map((lang) => (
            <motion.button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                currentLang === lang.code
                  ? 'bg-amber-50 text-amber-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              whileHover={{ x: 4 }}
            >
              <div className="flex items-center justify-between">
                <span>{lang.native}</span>
                <span className="text-xs text-gray-500">{lang.code.toUpperCase()}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;

