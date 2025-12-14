import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Function to extract language from URL path
const getLanguageFromPath = () => {
  if (typeof window === 'undefined') return 'en';
  const path = window.location.pathname;
  const match = path.match(/^\/(en|hi|od)(\/|$)/);
  return match ? match[1] : null;
};

// Set html lang attribute
const setHtmlLang = (lang) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
};

// Initialize i18n
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'od'],
    defaultNS: 'common',
    ns: ['common', 'navbar', 'pages', 'components'],
    
    // Detect language from localStorage first, then browser, then fallback to URL path
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    load: 'languageOnly',
    
    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transWrapTextNodes: '',
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

// Override language from URL path if present (after initialization)
const urlLang = getLanguageFromPath();
if (urlLang && urlLang !== i18n.language) {
  i18n.changeLanguage(urlLang);
}

// Initialize html lang attribute
const initialLang = i18n.language || 'en';
setHtmlLang(initialLang);

// Listen for language changes
i18n.on('languageChanged', (lng) => {
  setHtmlLang(lng);
  // Update localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
  }
  // Force a re-render by triggering a custom event that components can listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('i18n:languageChanged', { detail: { language: lng } }));
  }
});

export default i18n;

